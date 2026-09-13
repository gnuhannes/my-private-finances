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
