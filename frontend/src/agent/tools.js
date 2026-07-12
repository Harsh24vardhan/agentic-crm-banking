import { mockCustomers, mockTransactions } from "../../../shared/mockDatabase.js";
import { scoreConversion, draftMessage } from "../../../shared/heuristics.js";

/**
 * Filter and search for customers in the CRM database.
 * @param {Object} filters
 * @param {number} [filters.minBalance] - Minimum total balance
 * @param {number} [filters.minCreditScore] - Minimum credit score
 * @param {number} [filters.minIncome] - Minimum annual income
 * @param {string} [filters.segment] - Customer segment ("Standard", "High Value", "Ultra HNW")
 * @param {string} [filters.occupation] - Occupation search term
 */
export function get_customers(filters = {}) {
  let results = [...mockCustomers];

  if (filters.minBalance !== undefined) {
    results = results.filter(c => c.totalBalance >= filters.minBalance);
  }
  if (filters.minCreditScore !== undefined) {
    results = results.filter(c => c.creditScore >= filters.minCreditScore);
  }
  if (filters.minIncome !== undefined) {
    results = results.filter(c => c.annualIncome >= filters.minIncome);
  }
  if (filters.segment !== undefined && filters.segment !== "") {
    results = results.filter(c => c.segment.toLowerCase() === filters.segment.toLowerCase());
  }
  if (filters.riskProfile !== undefined && filters.riskProfile !== "") {
    results = results.filter(c => c.riskProfile.toLowerCase() === filters.riskProfile.toLowerCase());
  }
  if (filters.occupation !== undefined && filters.occupation !== "") {
    results = results.filter(c => c.occupation.toLowerCase().includes(filters.occupation.toLowerCase()));
  }
  if (filters.name !== undefined && filters.name !== "") {
    results = results.filter(c => c.name.toLowerCase().includes(filters.name.toLowerCase()));
  }

  return {
    success: true,
    count: results.length,
    data: results
  };
}

/**
 * Retrieve transaction history for a specific customer.
 * @param {string} customerId
 */
export function get_customer_transactions(customerId) {
  const transactions = mockTransactions.filter(t => t.customerId === customerId);
  const customer = mockCustomers.find(c => c.id === customerId);

  if (!customer) {
    return { success: false, error: `Customer with ID ${customerId} not found.` };
  }

  return {
    success: true,
    customerId,
    customerName: customer.name,
    count: transactions.length,
    data: transactions
  };
}

/**
 * Heuristically estimate likelihood of conversion for a specific product.
 * Delegates the actual scoring rules to the shared, data-source-agnostic model.
 * @param {string} customerId
 * @param {string} productType - "Personal Loan" | "Travel Elite Credit Card" | "Wealth Advisory"
 */
export function calculate_conversion_probability(customerId, productType) {
  const customer = mockCustomers.find(c => c.id === customerId);
  if (!customer) {
    return { success: false, error: `Customer with ID ${customerId} not found.` };
  }

  const transactions = mockTransactions.filter(t => t.customerId === customerId);
  const result = scoreConversion(customer, transactions, productType);

  return {
    success: true,
    customerId,
    customerName: customer.name,
    productType,
    ...result
  };
}

/**
 * Generate a highly personalized outreach message for the customer.
 * Delegates the actual copywriting rules to the shared, data-source-agnostic model.
 * @param {string} customerId
 * @param {string} productType
 * @param {string} channel - "WhatsApp" | "Email"
 */
export function generate_personalized_message(customerId, productType, channel = "WhatsApp") {
  const customer = mockCustomers.find(c => c.id === customerId);
  if (!customer) {
    return { success: false, error: `Customer with ID ${customerId} not found.` };
  }

  const message = draftMessage(customer, productType, channel);

  return {
    success: true,
    customerId,
    customerName: customer.name,
    productType,
    channel,
    message
  };
}
