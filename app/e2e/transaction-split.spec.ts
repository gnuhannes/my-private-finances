import { expect, test } from "@playwright/test";

/**
 * Split a transaction 70/30 between two categories through the real UI, then
 * confirm both categories show up in the dashboard's monthly category
 * breakdown — the report only reflects a split once services/reporting.py's
 * category-attribution selectable (#134) is wired up correctly end to end.
 */
test("splitting a transaction 70/30 shows both categories in the monthly breakdown", async ({
  page,
  request,
}) => {
  const account = await request.post("/api/accounts", {
    data: { name: "E2E Split Account", currency: "EUR", account_type: "bank" },
  });
  expect(account.ok()).toBeTruthy();
  const accountId = (await account.json()).id;

  const groceries = await request.post("/api/categories", {
    data: { name: "E2E Groceries" },
  });
  const household = await request.post("/api/categories", {
    data: { name: "E2E Household" },
  });
  expect(groceries.ok()).toBeTruthy();
  expect(household.ok()).toBeTruthy();

  const today = new Date().toISOString().slice(0, 10);
  const tx = await request.post("/api/transactions", {
    data: {
      account_id: accountId,
      booking_date: today,
      amount: "-100.00",
      currency: "EUR",
      payee: "E2E Supermarket",
      purpose: "Weekly shop",
    },
  });
  expect(tx.ok()).toBeTruthy();

  await page.goto("/transactions");
  await expect(page.getByText("E2E Supermarket")).toBeVisible();

  const row = page.getByRole("row").filter({ hasText: "E2E Supermarket" });
  await row.getByRole("button", { name: "Split" }).click();

  const dialog = page.locator("dialog");
  await expect(dialog.getByText("Split Transaction")).toBeVisible();

  await dialog.getByRole("button", { name: "Percentages" }).click();

  // Row 1 -> E2E Groceries, 70%
  await dialog.getByRole("button", { name: "Select…" }).first().click();
  await dialog.getByRole("option", { name: "E2E Groceries" }).click();
  await dialog.getByLabel("Percent").first().fill("70");

  // Row 2 -> E2E Household (its amount/percent is the computed remainder)
  await dialog.getByRole("button", { name: "Select…" }).first().click();
  await dialog.getByRole("option", { name: "E2E Household" }).click();

  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByRole("button", { name: /Split \(2\)/ })).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "My Private Finances" })).toBeVisible();
  await expect(page.getByText("E2E Groceries")).toBeVisible();
  await expect(page.getByText("E2E Household")).toBeVisible();
});
