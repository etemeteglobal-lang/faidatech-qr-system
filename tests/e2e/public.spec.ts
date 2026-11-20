import { test, expect } from "@playwright/test";

test("public landing page is reachable", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/FaidATech/i);
  await expect(page.locator("body")).toBeVisible();
});
