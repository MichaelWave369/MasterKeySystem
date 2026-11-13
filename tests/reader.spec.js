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


test("active recall keeps printed answers hidden until reveal and schedules self-rated review", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Recall quiz" }).click();
  await expect(page.getByRole("heading", { name: "Active recall" })).toBeVisible();
  await expect(page.locator(".recall-card h3")).toHaveText(
    "What is the world without in its relation to the world within?");
  await expect(page.locator(".recall-answer")).toHaveCount(0);
  await page.getByLabel("YOUR PRIVATE, TEMPORARY RECALL").fill("My answer from memory");
  await page.getByRole("button", { name: "Reveal printed answer" }).click();
  await expect(page.locator(".recall-answer")).toContainText(
    "The world without is a reflection of the world within.");
  await page.getByRole("button", { name: "I recalled it" }).click();
  await expect(page.locator(".recall-card h3")).toHaveText(
    "Upon what does all possession depend?");
  await expect(page.locator(".recall-draft")).toHaveValue("");
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem("mks.recallProgress.v1"))?.["1:1"]?.streak)).toBe(1);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Recall quiz" }).click();
  await expect(page.locator(".recall-card h3")).toHaveText(
    "Upon what does all possession depend?");
  await page.getByRole("button", { name: "All 24 weeks" }).click();
  await expect(page.locator(".recall-stat-row")).toContainText("240");
  await page.getByRole("button", { name: "All questions" }).click();
  await expect(page.locator(".recall-card h3")).toHaveText(
    "What is the world without in its relation to the world within?");
  expect(errors).toEqual([]);
});

test("quiz self-assessments survive JSON backup and restore without storing drafts", async ({ page }) => {
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Recall quiz" }).click();
  await page.getByLabel("YOUR PRIVATE, TEMPORARY RECALL").fill("This ephemeral answer is secret");
  await page.getByRole("button", { name: "Reveal printed answer" }).click();
  await page.getByRole("button", { name: "Review again" }).click();

  const downloadReady = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadReady;
  const file = await download.path();

  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Recall quiz" }).click();
  await expect(page.locator(".recall-stat-row")).toContainText("10 due today");

  page.once("dialog", dialog => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByRole("status")).toContainText("Backup restored");
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem("mks.recallProgress.v1"))?.["1:1"]?.streak)).toBe(0);
  await page.getByRole("tab", { name: "Recall quiz" }).click();
  await expect(page.locator(".recall-draft")).toHaveValue("");
  const backupText = await page.evaluate(async () => {
    const data = JSON.parse(localStorage.getItem("mks.recallProgress.v1"));
    return JSON.stringify(data);
  });
  expect(backupText).not.toContain("ephemeral answer");
});


test("24-week dashboard presents private totals and navigates to all study sections", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open study dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Study dashboard", exact: true })).toBeVisible();
  await expect(page.locator(".dashboard-week")).toHaveCount(24);
  await expect(page.getByTestId("metric-lessons")).toContainText("0 / 24");
  await expect(page.getByTestId("metric-practice")).toContainText("0");
  await expect(page.getByTestId("metric-reviews")).toContainText("0");
  await expect(page.getByTestId("metric-new")).toContainText("240");

  await page.getByRole("button", { name: "Practice Week 6" }).click();
  await expect(page).toHaveURL(/#week-6$/);
  await expect(page.getByRole("tab", { name: "Practice" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Photograph and attention" })).toBeVisible();

  await page.getByRole("tab", { name: "Study dashboard" }).click();
  await page.getByRole("button", { name: "Recall Week 24" }).click();
  await expect(page).toHaveURL(/#week-24$/);
  await expect(page.getByRole("tab", { name: "Recall quiz" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Active recall" })).toBeVisible();

  await page.getByRole("tab", { name: "Study dashboard" }).click();
  await page.getByRole("button", { name: "Read Week 1", exact: true }).click();
  await expect(page).toHaveURL(/#week-1$/);
  await expect(page.getByRole("heading", { name: "The World Within", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("dashboard updates from actual reading, journal, notes and recall actions", async ({ page }) => {
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Mark lesson complete" }).click();
  await page.getByRole("tab", { name: "Practice" }).click();
  await page.getByRole("button", { name: "Record a practice session" }).click();
  await page.getByRole("tab", { name: "My notes" }).click();
  await page.getByLabel("NOTES FOR WEEK 1").fill("My private observation");
  await page.getByRole("tab", { name: "Recall quiz" }).click();
  await page.getByRole("button", { name: "Reveal printed answer" }).click();
  await page.getByRole("button", { name: "I recalled it" }).click();

  await page.getByRole("tab", { name: "Study dashboard" }).click();
  await expect(page.getByTestId("metric-lessons")).toContainText("1 / 24");
  await expect(page.getByTestId("metric-practice")).toContainText("1");
  await expect(page.getByTestId("metric-reviews")).toContainText("0");
  await expect(page.getByTestId("metric-new")).toContainText("239");
  await expect(page.locator(".dashboard-detail-strip")).toContainText("1 weeks with private notes");
  await expect(page.locator(".dashboard-detail-strip")).toContainText("1 / 240 questions self-rated");
  await expect(page.getByTestId("week-1")).toContainText("Completed");
  await expect(page.getByTestId("week-1")).toContainText("1 practice session");
  await expect(page.getByTestId("week-1")).toContainText("1/10 questions rated");
  await expect(page.locator(".dashboard-recent-list li")).toHaveCount(1);

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Study dashboard" }).click();
  await expect(page.getByTestId("metric-lessons")).toContainText("1 / 24");
  await expect(page.getByTestId("metric-practice")).toContainText("1");
  await expect(page.getByTestId("metric-new")).toContainText("239");
});


test("full-book search links literal results to highlighted original passages", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Book search" }).click();
  await expect(page.getByRole("heading", { name: "Search the complete book" })).toBeVisible();
  await page.getByLabel("WORD OR PHRASE").fill("world within");
  await expect(page.locator(".search-result-count")).toContainText("matching source locations");
  await expect(page.locator(".search-hit").first().locator("mark")).toContainText(/world within/i);

  await page.getByRole("button", { name: "Lesson passages" }).click();
  await expect(page.locator(".search-hit-meta").first()).toContainText("ORIGINAL PASSAGE");
  await page.locator(".search-hit").first()
    .getByRole("button", { name: "Open original passage" }).click();
  await expect(page).toHaveURL(/#week-\d+-p-\d+$/);
  await expect(page.getByRole("tab", { name: "Original lesson" }))
    .toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".source-text .passage-active mark").first()).toContainText(/world within/i);

  const url = page.url();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(url);
  await expect(page.locator(".source-text .passage-active")).toContainText(/world within/i);
  expect(errors).toEqual([]);
});

test("search printed questions and answers via exact reloadable source links", async ({ page }) => {
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Book search" }).click();
  await page.getByLabel("WORD OR PHRASE").fill("two modes of mental activity");
  await page.getByRole("button", { name: "Study questions & answers" }).click();
  await expect(page.locator(".search-hit")).toHaveCount(1);
  await expect(page.locator(".search-hit")).toContainText("PRINTED STUDY QUESTION 11");
  await page.getByRole("button", { name: "Open printed question" }).click();
  await expect(page).toHaveURL(/#week-2-q-1$/);
  await expect(page.getByRole("tab", { name: "Study questions" }))
    .toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".question-target")).toHaveAttribute("open", "");
  await expect(page.locator(".question-target mark")).toContainText(/two modes of mental activity/i);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("#source-question-1")).toHaveAttribute("open", "");
  await expect(page.locator("#source-question-1")).toContainText("What are the two modes of mental activity?");
});

test("sidebar search opens precise results and treats regex punctuation as literal", async ({ page }) => {
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.getByLabel("FIND A LESSON OR PASSAGE").fill("concentration");
  await page.getByRole("button", { name: "View exact source matches" }).click();
  await expect(page.getByRole("tab", { name: "Book search" }))
    .toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("WORD OR PHRASE")).toHaveValue("concentration");
  await expect(page.locator(".search-hit").first()).toBeVisible();

  await page.getByLabel("WORD OR PHRASE").fill(".*(");
  await expect(page.locator(".search-result-count")).toContainText("0 matching source locations");
  await expect(page.getByText("No literal matches.")).toBeVisible();
});


test("saved passage and personal note survive reload and study backup restore", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Save passage 9", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unsave passage 9", exact: true }))
    .toHaveAttribute("aria-pressed", "true");

  await page.getByRole("tab", { name: "Saved sources" }).click();
  await expect(page.getByRole("heading", { name: "Your saved sources" })).toBeVisible();
  await expect(page.locator(".saved-entry")).toHaveCount(1);
  await expect(page.getByTestId("saved-p-1-9")).toContainText("WEEK 1 · ORIGINAL PASSAGE 9");
  await page.getByRole("textbox", { name: "Personal note for Week 1 passage 9" })
    .fill("I want to compare this original passage with later thinkers.");

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Saved sources" }).click();
  await expect(page.getByRole("textbox", { name: "Personal note for Week 1 passage 9" }))
    .toHaveValue("I want to compare this original passage with later thinkers.");

  const downloadReady = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const downloaded = await downloadReady;
  const backupFile = await downloaded.path();

  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Saved sources" }).click();
  await expect(page.locator(".saved-entry")).toHaveCount(0);

  page.once("dialog", dialog => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(backupFile);
  await expect(page.getByRole("status")).toContainText("Backup restored");
  await page.getByRole("tab", { name: "Saved sources" }).click();
  await expect(page.getByRole("textbox", { name: "Personal note for Week 1 passage 9" }))
    .toHaveValue("I want to compare this original passage with later thinkers.");

  await page.getByRole("button", { name: "Open original passage" }).click();
  await expect(page).toHaveURL(/#week-1-p-9$/);
  await expect(page.locator("#source-passage-9")).toBeVisible();
  expect(errors).toEqual([]);
});

test("search results save printed study questions and shelf can reopen and remove them", async ({ page }) => {
  await page.goto("/MasterKeySystem/", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Book search" }).click();
  await page.getByLabel("WORD OR PHRASE").fill("two modes of mental activity");
  await page.getByRole("button", { name: "Study questions & answers" }).click();
  await expect(page.locator(".search-hit")).toHaveCount(1);
  await page.getByRole("button", { name: "Save source" }).click();
  await expect(page.getByRole("button", { name: "✓ Saved" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("tab", { name: "Saved sources" }).click();
  await expect(page.getByTestId("saved-q-2-1")).toContainText("PRINTED QUESTION 11");
  await page.getByRole("textbox", { name: "Personal note for Week 2 question 1" })
    .fill("Question to revisit.");
  await page.getByRole("button", { name: "Open original question" }).click();
  await expect(page).toHaveURL(/#week-2-q-1$/);
  await expect(page.locator("#source-question-1")).toHaveAttribute("open", "");
  await page.getByRole("tab", { name: "Saved sources" }).click();
  await expect(page.getByRole("textbox", { name: "Personal note for Week 2 question 1" }))
    .toHaveValue("Question to revisit.");
  await page.getByRole("button", { name: "Remove saved question Week 2 position 1" }).click();
  await expect(page.locator(".saved-entry")).toHaveCount(0);
});
