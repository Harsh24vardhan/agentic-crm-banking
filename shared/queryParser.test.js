import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseQueryIntent } from "./queryParser.js";

describe("parseQueryIntent — product detection", () => {
  test("detects Travel Elite Credit Card from 'travel' keyword", () => {
    const { productType } = parseQueryIntent("Find frequent flyer profiles for premium Travel Elite Card upgrades.");
    assert.equal(productType, "Travel Elite Credit Card");
  });

  test("detects Wealth Advisory from 'wealth' keyword", () => {
    const { productType } = parseQueryIntent("Find high net-worth individuals for wealth advisory campaigns.");
    assert.equal(productType, "Wealth Advisory");
  });

  test("detects Personal Loan explicitly", () => {
    const { productType } = parseQueryIntent("Who is eligible to refinance their personal loan?");
    assert.equal(productType, "Personal Loan");
  });

  test("defaults to Personal Loan when no product keyword is present", () => {
    const { productType } = parseQueryIntent("Show me all customers in the Western Region.");
    assert.equal(productType, "Personal Loan");
  });
});

describe("parseQueryIntent — numeric filters", () => {
  test("parses a plain balance threshold", () => {
    const { filters } = parseQueryIntent("Find customers with balance > 50000");
    assert.equal(filters.minBalance, 50000);
  });

  test("parses a 'k'-suffixed balance threshold", () => {
    const { filters } = parseQueryIntent("Find customers with balance over 100k");
    assert.equal(filters.minBalance, 100000);
  });

  test("parses a credit score threshold", () => {
    const { filters } = parseQueryIntent("credit score above 700 for travel card upgrades");
    assert.equal(filters.minCreditScore, 700);
  });

  test("parses a 'k'-suffixed income threshold", () => {
    const { filters } = parseQueryIntent("income above 80k for a personal loan");
    assert.equal(filters.minIncome, 80000);
  });
});

describe("parseQueryIntent — segment filter", () => {
  test("matches 'high value' (space-separated)", () => {
    const { filters } = parseQueryIntent("Find high value customers for a personal loan.");
    assert.equal(filters.segment, "High Value");
  });

  test("matches 'high-value' (hyphenated)", () => {
    const { filters } = parseQueryIntent("Find high-value customers for a personal loan.");
    assert.equal(filters.segment, "High Value");
  });

  test("matches 'ultra hnw' as its own tier, not High Value", () => {
    const { filters } = parseQueryIntent("Target ultra hnw clients for wealth advisory.");
    assert.equal(filters.segment, "Ultra HNW");
  });
});

describe("parseQueryIntent — risk profile filter", () => {
  test("matches 'aggressive risk'", () => {
    const { filters } = parseQueryIntent("Find customers with aggressive risk appetite.");
    assert.equal(filters.riskProfile, "Aggressive");
  });

  test("matches 'low risk' as Conservative", () => {
    const { filters } = parseQueryIntent("Find low risk customers for a savings pitch.");
    assert.equal(filters.riskProfile, "Conservative");
  });
});

describe("parseQueryIntent — name filter regression (critical bug fix)", () => {
  // This is the assignment's own example query. It used to return zero leads
  // because the old name regex matched "customer" as a substring of
  // "customers" and captured "s" (or the next word) as a fake name filter,
  // which then filtered out every real customer. See README "Key Design
  // Decisions" #11 for the full writeup.
  test("the assignment's example query does NOT produce a spurious name filter", () => {
    const { filters, productType } = parseQueryIntent(
      "Find high-value customers likely to convert for a personal loan this month and generate personalized WhatsApp messages."
    );
    assert.equal(filters.name, undefined, "plural 'customers' must not be mistaken for a 'customer <Name>' phrase");
    assert.equal(filters.segment, "High Value");
    assert.equal(productType, "Personal Loan");
  });

  test("plain 'customers' with no following capitalized word never sets a name filter", () => {
    const { filters } = parseQueryIntent("List all customers in the Mumbai region.");
    assert.equal(filters.name, undefined);
  });

  test("an explicit 'customer <Name>' phrase still sets the name filter", () => {
    const { filters } = parseQueryIntent("Pull up customer Priya Sharma's transaction history.");
    assert.equal(filters.name, "Priya Sharma");
  });

  test("an explicit 'client <Name>' phrase still sets the name filter", () => {
    const { filters } = parseQueryIntent("What is client Rohan's credit score?");
    assert.equal(filters.name, "Rohan");
  });
});
