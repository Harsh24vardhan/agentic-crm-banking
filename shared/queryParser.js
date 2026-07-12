/**
 * Parses a Relationship Manager's natural-language query into a product
 * intent and a set of customer filters. Pure text parsing — no data-source
 * dependency — shared by both the client-side fallback agent and the
 * server-side agent.
 * @param {string} query
 */
export function parseQueryIntent(query) {
  const q = query.toLowerCase();

  // 1. Detect Product
  let productType = "Personal Loan"; // default
  if (q.includes("travel") || q.includes("credit card") || q.includes("card") || q.includes("rewards")) {
    productType = "Travel Elite Credit Card";
  } else if (q.includes("wealth") || q.includes("investment") || q.includes("advisory") || q.includes("advisor") || q.includes("hnw") || q.includes("asset")) {
    productType = "Wealth Advisory";
  } else if (q.includes("personal loan") || q.includes("loan") || q.includes("borrow") || q.includes("refinance")) {
    productType = "Personal Loan";
  }

  // 2. Detect Filters
  const filters = {};

  // Min Balance parsing (e.g. "balance > 50000", "balance > ₹50k", "balance > 100k")
  const balanceMatch = q.match(/\bbalance\s*(?:>|>=|above|over|more than)?\s*[$₹]?(\d+)(k)?/i);
  if (balanceMatch) {
    let amt = parseInt(balanceMatch[1]);
    if (balanceMatch[2]) amt *= 1000;
    filters.minBalance = amt;
  }

  // Credit Score parsing (e.g. "credit score > 700", "credit > 750")
  const creditMatch = q.match(/\b(?:credit|credit score)\s*(?:>|>=|above|over)?\s*(\d+)/i);
  if (creditMatch) {
    filters.minCreditScore = parseInt(creditMatch[1]);
  }

  // Income parsing (e.g. "income > 100000", "income > ₹80k")
  const incomeMatch = q.match(/\bincome\s*(?:>|>=|above|over)?\s*[$₹]?(\d+)(k)?/i);
  if (incomeMatch) {
    let amt = parseInt(incomeMatch[1]);
    if (incomeMatch[2]) amt *= 1000;
    filters.minIncome = amt;
  }

  // Segment parsing (matches both "high value" and "high-value")
  if (q.includes("ultra hnw") || q.includes("ultra high net worth")) {
    filters.segment = "Ultra HNW";
  } else if (q.includes("high value") || q.includes("high-value") || q.includes("hvc") || q.includes("premium")) {
    filters.segment = "High Value";
  } else if (q.includes("standard")) {
    filters.segment = "Standard";
  }

  // Risk Profile parsing
  if (q.includes("aggressive risk") || q.includes("risk is aggressive") || q.includes("high risk")) {
    filters.riskProfile = "Aggressive";
  } else if (q.includes("conservative risk") || q.includes("risk is conservative") || q.includes("low risk")) {
    filters.riskProfile = "Conservative";
  } else if (q.includes("moderate risk") || q.includes("risk is moderate") || q.includes("medium risk")) {
    filters.riskProfile = "Moderate";
  }

  // 3. Name Parsing — only triggers on an explicit "customer NAME" / "client NAME"
  // phrase with a capitalized, proper-noun-looking name, matched against the
  // ORIGINAL (non-lowercased) query. Deliberately does NOT trigger on a bare
  // "for X" — that matched ordinary prose like "...convert for a personal loan..."
  // and silently zeroed out every result (it matched "customer" as a substring of
  // "customers" and captured filler words as a fake name filter).
  const nameMatch = query.match(/\b(?:customer|client)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)?)/);
  if (nameMatch) {
    filters.name = nameMatch[1].trim();
  }

  return { productType, filters };
}
