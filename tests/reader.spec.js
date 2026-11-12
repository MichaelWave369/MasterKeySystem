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
