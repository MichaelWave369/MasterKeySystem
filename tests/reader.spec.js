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
