import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { scoreConversion, draftMessage } from "./heuristics.js";

describe("scoreConversion — Personal Loan", () => {
  test("strong candidate (high income, excellent credit, financing intent) scores High", () => {
    const customer = {
      name: "Arjun Mehta",
      annualIncome: 150000,
      creditScore: 780,
      totalBalance: 120000,
      activeProducts: ["Savings Account"],
      notes: "Expressed interest in financing for property expansion.",
      riskProfile: "Moderate",
      segment: "High Value"
    };
    const result = scoreConversion(customer, [], "Personal Loan");
    assert.equal(result.conversionScore, 90);
    assert.equal(result.likelihood, "High");
    assert.ok(result.justification.length >= 4);
  });

  test("weak candidate (low income, subprime credit) is floored at 5, not negative", () => {
    const customer = {
      name: "Weak Case",
      annualIncome: 30000,
      creditScore: 600,
      totalBalance: 5000,
      activeProducts: [],
      notes: "",
      riskProfile: "Conservative",
      segment: "Standard"
    };
    const result = scoreConversion(customer, [], "Personal Loan");
    assert.equal(result.conversionScore, 5);
    assert.equal(result.likelihood, "Low");
  });
});

describe("scoreConversion — Travel Elite Credit Card", () => {
  test("frequent traveler with no existing card scores near the ceiling", () => {
    const customer = {
      name: "Frequent Flyer",
      annualIncome: 90000,
      creditScore: 740,
      totalBalance: 60000,
      activeProducts: ["Savings Account"],
      notes: "Frequent international travel for business trips.",
      riskProfile: "Moderate",
      segment: "High Value"
    };
    const transactions = [
      { category: "Travel", description: "Flight to Goa" },
      { category: "Travel", description: "Hotel Goa" },
      { category: "Travel", description: "IndiGo Airlines" }
    ];
    const result = scoreConversion(customer, transactions, "Travel Elite Credit Card");
    assert.equal(result.conversionScore, 98);
    assert.equal(result.likelihood, "High");
  });

  test("a customer who already holds the card is scored low and not re-pitched", () => {
    const customer = {
      name: "Existing Holder",
      annualIncome: 100000,
      creditScore: 750,
      totalBalance: 50000,
      activeProducts: ["Travel Elite Credit Card"],
      notes: "",
      riskProfile: "Moderate",
      segment: "High Value"
    };
    const result = scoreConversion(customer, [], "Travel Elite Credit Card");
    assert.equal(result.conversionScore, 5);
    assert.deepEqual(result.justification, ["Already holds a premium travel rewards product."]);
  });
});

describe("scoreConversion — Wealth Advisory", () => {
  test("Ultra HNW client with advisory intent scores High", () => {
    const customer = {
      name: "Vikram Singh",
      annualIncome: 500000,
      creditScore: 800,
      totalBalance: 350000,
      activeProducts: ["Premium Savings"],
      notes: "Interested in estate planning and wealth advisory services.",
      riskProfile: "Aggressive",
      segment: "Ultra HNW"
    };
    const result = scoreConversion(customer, [], "Wealth Advisory");
    assert.equal(result.conversionScore, 90);
    assert.equal(result.likelihood, "High");
  });
});

describe("scoreConversion — general contract", () => {
  test("score is always clamped between 5 and 98", () => {
    for (const productType of ["Personal Loan", "Travel Elite Credit Card", "Wealth Advisory"]) {
      const customer = {
        name: "Edge Case",
        annualIncome: 0,
        creditScore: 300,
        totalBalance: 0,
        activeProducts: [],
        notes: "unlikely to take additional debt",
        riskProfile: "Conservative",
        segment: "Standard"
      };
      const result = scoreConversion(customer, [], productType);
      assert.ok(result.conversionScore >= 5 && result.conversionScore <= 98, `${productType} score ${result.conversionScore} out of clamp range`);
    }
  });

  test("an unrecognized product type falls back to the neutral default score", () => {
    const customer = { name: "N/A", annualIncome: 0, creditScore: 0, totalBalance: 0, activeProducts: [], notes: "" };
    const result = scoreConversion(customer, [], "Some Other Product");
    assert.equal(result.conversionScore, 50);
    assert.equal(result.likelihood, "Medium");
    assert.deepEqual(result.justification, ["Standard evaluation model applied."]);
  });
});

describe("draftMessage", () => {
  test("WhatsApp Personal Loan default message is personalized with the first name", () => {
    const message = draftMessage({ name: "Neha Kapoor", notes: "", segment: "Standard" }, "Personal Loan", "WhatsApp");
    assert.match(message, /Neha/);
    assert.match(message, /personal loan/i);
  });

  test("WhatsApp Personal Loan message pivots to renewal copy when the note says the loan is expiring", () => {
    const message = draftMessage(
      { name: "Ramesh Iyer", notes: "Active personal loan expiring next month.", segment: "High Value" },
      "Personal Loan",
      "WhatsApp"
    );
    assert.match(message, /wraps up next month/);
  });

  test("Email channel produces a Subject line", () => {
    const message = draftMessage({ name: "Neha Kapoor", notes: "", segment: "Standard" }, "Personal Loan", "Email");
    assert.match(message, /^Subject:/);
  });

  test("Travel card message references international usage when notes indicate it", () => {
    const message = draftMessage(
      { name: "Karan Malhotra", notes: "Frequent international travel for business.", segment: "High Value" },
      "Travel Elite Credit Card",
      "WhatsApp"
    );
    assert.match(message, /international travel transactions/);
  });

  test("Wealth Advisory message uses formal address and bond language for Conservative risk profiles", () => {
    const message = draftMessage(
      { name: "Suresh Rao", notes: "", segment: "Ultra HNW", riskProfile: "Conservative" },
      "Wealth Advisory",
      "WhatsApp"
    );
    assert.match(message, /Mr\.\/Ms\. Rao/);
    assert.match(message, /municipal bonds/);
  });
});
