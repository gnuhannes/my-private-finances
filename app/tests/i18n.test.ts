import { describe, expect, it } from "vitest";
import en from "../src/i18n/en.json";
import de from "../src/i18n/de.json";

describe("welcome i18n keys", () => {
  const expectedKeys = [
    "stepProgress",
    "skip",
    "back",
    "next",
    "introTitle",
    "introPrivacy",
    "languageLabel",
    "currencyLabel",
    "accountTitle",
    "accountCopy",
    "startingBalanceLabel",
    "asOfDateLabel",
    "addAccount",
    "categoriesTitle",
    "categoriesCopy",
    "categoriesSubmit",
    "categoriesSubmitted",
    "importTitle",
    "importCopy",
    "importLater",
    "importSuccess",
    "doneTitle",
    "doneSummary",
    "goToDashboard",
    "goToImport",
    "goToRules",
  ];

  it.each(expectedKeys)("en.welcome.%s is a non-empty string", (key) => {
    const value = (en.welcome as Record<string, string>)[key];
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it.each(expectedKeys)("de.welcome.%s is a non-empty string", (key) => {
    const value = (de.welcome as Record<string, string>)[key];
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });
});

describe("categories.starter i18n keys", () => {
  const groups = ["fixed", "variable", "income"] as const;

  it.each(groups)("en.categories.starter.%s has at least one item", (group) => {
    const items = (en.categories.starter as Record<string, Record<string, string>>)[group];
    expect(Object.keys(items).length).toBeGreaterThan(0);
  });

  it.each(groups)("de.categories.starter.%s has the same keys as en", (group) => {
    const enItems = Object.keys(
      (en.categories.starter as Record<string, Record<string, string>>)[group],
    ).sort();
    const deItems = Object.keys(
      (de.categories.starter as Record<string, Record<string, string>>)[group],
    ).sort();
    expect(deItems).toEqual(enItems);
  });
});

describe("settings.rerunWizard i18n keys", () => {
  const expectedKeys = ["rerunWizardTitle", "rerunWizardDesc", "rerunWizard"];

  it.each(expectedKeys)("en.settings.%s is a non-empty string", (key) => {
    const value = (en.settings as Record<string, string>)[key];
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });

  it.each(expectedKeys)("de.settings.%s is a non-empty string", (key) => {
    const value = (de.settings as Record<string, string>)[key];
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);
  });
});
