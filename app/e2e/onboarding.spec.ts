import { expect, test } from "@playwright/test";

const CSV_CONTENT =
  "booking_date,amount,currency,payee,purpose,external_id\n" +
  "2026-01-18,-12.34,EUR,Rewe,Groceries,e2e-1\n" +
  "2026-01-19,-4.50,EUR,Baecker,Bread,e2e-2\n";

/**
 * First-run setup (105): fresh DB -> full wizard -> populated dashboard.
 * This is the only spec that relies on the DB being empty of accounts on boot,
 * so it must run before any other spec seeds one (see smoke.spec.ts, which
 * stamps onboarding itself and no longer depends on ordering).
 */
test("fresh DB redirects to the wizard and completing it lands on a populated dashboard", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome$/);

  // Step 1 — intro.
  await expect(page.getByText("Step 1 of 5")).toBeVisible();
  await page.getByText("Next", { exact: true }).click();

  // Step 2 — first account + starting balance.
  await expect(page.getByText("Step 2 of 5")).toBeVisible();
  await page.getByLabel("Name").fill("Onboarding Checking");
  await page.getByLabel("Starting balance").fill("1000");
  await page.getByText("Add account", { exact: true }).click();
  await expect(page.getByText("Onboarding Checking")).toBeVisible();
  await page.getByText("Next", { exact: true }).click();

  // Step 3 — starter categories.
  await expect(page.getByText("Step 3 of 5")).toBeVisible();
  await page.getByText("Add selected categories", { exact: true }).click();
  await expect(page.getByText("Categories added.")).toBeVisible();
  await page.getByText("Next", { exact: true }).click();

  // Step 4 — optional import.
  await expect(page.getByText("Step 4 of 5")).toBeVisible();
  // Second <select> on this step is the account picker; index 1 is the only real account
  // (index 0 is the "Select account..." placeholder).
  await page.getByRole("combobox").nth(1).selectOption({ index: 1 });
  await page.locator('input[type="file"]').setInputFiles({
    name: "onboarding.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(CSV_CONTENT),
  });
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText(/imported, .* auto-categorized\./)).toBeVisible();
  await page.getByText("Next", { exact: true }).click();

  // Step 5 — done.
  await expect(page.getByText("Step 5 of 5")).toBeVisible();
  await expect(page.getByText(/2 transactions/)).toBeVisible();
  await page.getByText("Go to Dashboard", { exact: true }).click();

  // Landed on a populated dashboard, guard no longer redirects to /welcome.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "My Private Finances" })).toBeVisible();
  await expect(page.getByText("No accounts yet.")).toHaveCount(0);
});
