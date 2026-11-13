import { test, expect } from "@playwright/test";

test("GitHub Pages build mounts React and navigates through lessons", async ({ page }) => {
  const runtimeErrors = [];
  page.on("pageerror", error => runtimeErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") runtimeErrors.push("console: " + message.text());
  });
  page.on("requestfailed", request => runtimeErrors.push("network: " + request.url() + " " + (request.failure()?.errorText || "")));
  page.on("response", response => {
    if (response.status() >= 400) runtimeErrors.push("HTTP " + response.status() + " " + response.url());
  });

  const response = await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  console.log("SMOKE DEBUG: URL", page.url());
  console.log("SMOKE DEBUG: title", await page.title());
  console.log("SMOKE DEBUG: body", (await page.locator("body").innerText()).slice(0, 800));
  console.log("SMOKE DEBUG: scripts", JSON.stringify(await page.locator("script[src]").evaluateAll(nodes => nodes.map(node => node.src))));
  console.log("SMOKE DEBUG: errors", JSON.stringify(runtimeErrors));

  await expect(page.getByRole("heading", { name: "The World Within", exact: true })).toBeVisible();
  await expect(page.locator(".source-text")).toContainText("That much gathers more");

  await page.getByRole("button", { name: /Next lesson/ }).click();
  await expect(page.getByRole("heading", { name: "The Conscious and Subconscious", exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Study questions" }).click();
  await expect(page.getByText("What are the two modes of mental activity?")).toBeVisible();

  expect(runtimeErrors, "no uncaught React or JavaScript exceptions").toEqual([]);
});


test("notes backup is downloadable and restores completed lessons", async ({ page }) => {
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "My notes" }).click();
  await page.getByLabel("NOTES FOR WEEK 1").fill("My private reflection on stillness");
  await page.getByRole("button", { name: "Mark lesson complete" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  const exportFile = await download.path();

  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "My notes" }).click();
  await expect(page.getByLabel("NOTES FOR WEEK 1")).toHaveValue("");

  page.once("dialog", dialog => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(exportFile);
  await expect(page.getByRole("status")).toContainText("Backup restored");
  await expect(page.getByLabel("NOTES FOR WEEK 1")).toHaveValue("My private reflection on stillness");
  await expect(page.getByRole("button", { name: "Lesson completed" })).toBeVisible();
});

test("book stays readable offline after the first successful visit", async ({ page, context }) => {
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller !== null, { timeout: 10000 });

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "The World Within", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next lesson" }).click();
  await expect(page.getByRole("heading", { name: "The Conscious and Subconscious", exact: true })).toBeVisible();
  await context.setOffline(false);
});


test("concept atlas links a literal source match to a reloadable passage", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Concept Atlas" }).click();
  await expect(page.getByRole("heading", { name: "Explore concepts across the book" })).toBeVisible();
  await page.getByRole("button", { name: /Universal Mind.*matching passages/ }).click();

  const first = page.locator(".atlas-hit").first();
  await expect(first.locator("blockquote")).not.toBeEmpty();
  await first.getByRole("button", { name: "Open original passage" }).click();

  await expect(page.getByRole("tab", { name: "Original lesson" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".source-text .passage-active")).toBeVisible();
  await expect(page).toHaveURL(/#week-\d+-p-\d+$/);
  const url = page.url();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(url);
  await expect(page.locator(".source-text .passage-active")).toBeVisible();
  expect(errors).toEqual([]);
});


test("voice reader speaks exact passages with voice, rate, pause, skip and stop", async ({ page }) => {
  await page.addInitScript(() => {
    class FakeUtterance {
      constructor(text) { this.text = text; this.rate = 1; this.pitch = 1; }
    }
    const synth = {
      current: null,
      paused: false,
      addEventListener() {},
      removeEventListener() {},
      getVoices() {
        return [{ voiceURI: "test-voice", name: "Test Reader", lang: "en-US", localService: true }];
      },
      speak(utterance) {
        this.current = utterance;
        window.__spoken.push({ text: utterance.text, rate: utterance.rate, voice: utterance.voice?.name });
      },
      cancel() { this.current = null; window.__speechCancels++; },
      pause() { this.paused = true; },
      resume() { this.paused = false; },
    };
    window.__spoken = [];
    window.__speechCancels = 0;
    window.__speechNext = () => {
      const current = synth.current;
      synth.current = null;
      current?.onend?.();
    };
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synth });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
  });

  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Listen to this lesson" })).toBeVisible();
  await page.getByRole("combobox", { name: "Voice", exact: true }).selectOption("test-voice");
  await expect(page.getByRole("combobox", { name: "Start at passage" })).toBeVisible();
  await page.getByLabel("Speed").selectOption("1.3");
  await page.getByRole("button", { name: "Play lesson" }).click();

  await expect(page.locator(".source-text .passage-speaking")).toHaveCount(1);
  await expect(page.locator(".voice-progress")).toContainText("Reading passage 1");
  const original = await page.locator(".source-text p").first().innerText();
  const first = await page.evaluate(() => window.__spoken[0]);
  expect(original.startsWith(first.text)).toBe(true);
  expect(first.rate).toBe(1.3);
  expect(first.voice).toBe("Test Reader");

  await page.getByRole("button", { name: "Pause narration" }).click();
  await expect(page.getByRole("button", { name: "Resume narration" })).toBeVisible();
  expect(await page.evaluate(() => window.speechSynthesis.paused)).toBe(true);
  await page.getByRole("button", { name: "Resume narration" }).click();
  expect(await page.evaluate(() => window.speechSynthesis.paused)).toBe(false);

  await page.getByRole("button", { name: "Next passage" }).click();
  await expect(page.locator(".voice-progress")).toContainText("Reading passage 2");
  await expect(page.locator("#source-passage-2")).toHaveClass(/passage-speaking/);
  const second = await page.locator("#source-passage-2").innerText();
  const spoken = await page.evaluate(() => window.__spoken.at(-1).text);
  expect(second.startsWith(spoken)).toBe(true);

  await page.getByRole("button", { name: "Stop narration" }).click();
  await expect(page.locator(".source-text .passage-speaking")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Play lesson" })).toBeEnabled();

  await page.getByRole("button", { name: "Play lesson" }).click();
  const count = await page.evaluate(() => window.__speechCancels);
  await page.getByRole("button", { name: "Next lesson" }).click();
  await expect(page.getByRole("heading", { name: "The Conscious and Subconscious", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__speechCancels)).toBeGreaterThan(count);
  await expect(page.locator(".source-text .passage-speaking")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("voice reader explains unavailable text-to-speech without hiding source", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: undefined });
  });
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await expect(page.locator(".voice-reader [role='status']")).toContainText("isn't available");
  await expect(page.locator(".source-text")).toContainText("That much gathers more");
});


test("audio bookmarks survive navigation, reload, and JSON backup restore", async ({ page }) => {
  await page.addInitScript(() => {
    class FakeUtterance { constructor(text) { this.text = text; } }
    const synth = {
      paused: false, current: null,
      getVoices: () => [{ voiceURI: "test-voice", name: "Test Voice", lang: "en-US", localService: true }],
      addEventListener() {}, removeEventListener() {},
      speak(utterance) { this.current = utterance; window.__audioLog.push(utterance.text); },
      cancel() { this.current = null; }, pause() { this.paused = true; },
      resume() { this.paused = false; },
    };
    window.__audioLog = [];
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synth });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
  });

  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.getByRole("combobox", { name: "Start at passage" }).selectOption("4");
  await expect(page.locator(".voice-progress")).toContainText("Ready at passage 4");
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem("mks.audioBookmarks.v1"))?.["1"])).toBe(4);

  await page.getByRole("button", { name: "Next lesson" }).click();
  await page.getByRole("combobox", { name: "Start at passage" }).selectOption("3");
  await page.getByRole("button", { name: "Previous lesson" }).click();
  await expect(page.locator(".voice-progress")).toContainText("Ready at passage 4");

  await page.getByRole("checkbox", { name: "Enable keyboard shortcuts" }).check();
  await page.locator("#source-passage-4").focus();
  await page.keyboard.press("Alt+Shift+P");
  await expect(page.locator(".voice-progress")).toContainText("Reading passage 4");
  await expect(page.locator("#source-passage-4")).toHaveClass(/passage-speaking/);

  await page.keyboard.press("Alt+Shift+ArrowRight");
  await expect(page.locator(".voice-progress")).toContainText("Reading passage 5");
  await page.keyboard.press("Alt+Shift+P");
  await expect(page.locator(".voice-progress")).toContainText("Paused at passage 5");
  await page.keyboard.press("Alt+Shift+P");
  await expect(page.locator(".voice-progress")).toContainText("Reading passage 5");
  await page.keyboard.press("Alt+Shift+S");
  await expect(page.locator(".voice-progress")).toContainText("Ready at passage 5");
  await expect(page.locator(".source-text .passage-speaking")).toHaveCount(0);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const downloaded = await downloadPromise;
  const backupFile = await downloaded.path();

  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".voice-progress")).toContainText("Ready at passage 1");

  page.once("dialog", dialog => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(backupFile);
  await expect(page.getByRole("status")).toContainText("Backup restored");
  await page.getByRole("tab", { name: "Original lesson" }).click();
  await expect(page.locator(".voice-progress")).toContainText("Ready at passage 5");
  await expect(page.getByTestId("audio-bookmark")).toContainText("passage 5");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".voice-progress")).toContainText("Ready at passage 5");

  expect(errors).toEqual([]);
});

test("keyboard shortcuts remain off by default and ignore editing controls", async ({ page }) => {
  await page.addInitScript(() => {
    const synth = {
      getVoices: () => [], addEventListener() {}, removeEventListener() {},
      cancel() {}, pause() {}, resume() {},
      speak() { window.__speechCalls++; },
    };
    window.__speechCalls = 0;
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synth });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true, value: class { constructor(text) { this.text = text; } },
    });
  });
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  const checkbox = page.getByRole("checkbox", { name: "Enable keyboard shortcuts" });
  await expect(checkbox).not.toBeChecked();
  await page.locator("#source-passage-1").focus();
  await page.keyboard.press("Alt+Shift+P");
  await expect(page.locator(".voice-progress")).toContainText("Ready at passage 1");
  expect(await page.evaluate(() => window.__speechCalls)).toBe(0);

  await checkbox.check();
  await page.getByRole("combobox", { name: "Start at passage" }).focus();
  await page.keyboard.press("Alt+Shift+P");
  await expect(page.locator(".voice-progress")).toContainText("Ready at passage 1");
  expect(await page.evaluate(() => window.__speechCalls)).toBe(0);
});


test("weekly practice source excerpts link to actual original passages", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Practice" }).click();
  await expect(page.getByRole("heading", { name: "Physical stillness" })).toBeVisible();
  await expect(page.locator(".practice-source-passage").first()).toContainText("44. Now make the application:");

  await page.locator(".practice-source-passage").first().getByRole("button", {
    name: "View in original lesson",
  }).click();
  await expect(page.getByRole("tab", { name: "Original lesson" }))
    .toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".source-text .passage-active")).toContainText("44. Now make the application:");
  await expect(page).toHaveURL(/#week-1-p-\d+$/);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".source-text .passage-active")).toContainText("44. Now make the application:");

  await page.getByRole("button", { name: "Next lesson" }).click();
  await page.getByRole("button", { name: "Next lesson" }).click();
  await page.getByRole("button", { name: "Next lesson" }).click();
  await page.getByRole("button", { name: "Next lesson" }).click();
  await page.getByRole("button", { name: "Next lesson" }).click();
  await page.getByRole("tab", { name: "Practice" }).click();
  await expect(page.getByRole("heading", { name: "Photograph and attention" })).toBeVisible();
  await expect(page.locator(".practice-source-passage")).toContainText("bring a photograph with you");
  expect(errors).toEqual([]);
});

test("private practice history can be exported, restored, and removed", async ({ page }) => {
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Practice" }).click();
  await expect(page.getByText("No practice sessions logged for this week.")).toBeVisible();
  await page.getByRole("button", { name: "Record a practice session" }).click();
  await expect(page.locator(".practice-count")).toContainText("1 sessions");
  await expect(page.locator(".practice-session")).toHaveCount(1);

  const downloadReady = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const downloaded = await downloadReady;
  const backupFile = await downloaded.path();

  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Practice" }).click();
  await expect(page.locator(".practice-count")).toContainText("0 sessions");

  page.once("dialog", dialog => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(backupFile);
  await expect(page.getByRole("status")).toContainText("Backup restored");
  await page.getByRole("tab", { name: "Practice" }).click();
  await expect(page.locator(".practice-session")).toHaveCount(1);

  await page.locator(".practice-session").getByRole("button", { name: /Remove practice entry/ }).click();
  await expect(page.locator(".practice-session")).toHaveCount(0);
  await expect(page.locator(".practice-count")).toContainText("0 sessions");
});
