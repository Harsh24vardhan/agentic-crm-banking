import { getCustomersDb, getTransactionsDb, getCustomerByIdDb } from "../db/index.js";
import { scoreConversion, draftMessage } from "../../../shared/heuristics.js";

/**
 * Filter and search for customers in the CRM database.
 * @param {Object} filters
 */
export async function get_customers(filters = {}) {
  return await getCustomersDb(filters);
}

/**
 * Retrieve transaction history for a specific customer.
 * @param {string} customerId
 */
export async function get_customer_transactions(customerId) {
  const customerResult = await getCustomerByIdDb(customerId);
  if (!customerResult.success) {
    return { success: false, error: `Customer with ID ${customerId} not found.` };
  }
  const customer = customerResult.data;

  const txResult = await getTransactionsDb(customerId);
  if (!txResult.success) {
    return txResult;
  }
  const transactions = txResult.data;

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
export async function calculate_conversion_probability(customerId, productType) {
  const customerResult = await getCustomerByIdDb(customerId);
  if (!customerResult.success) {
    return { success: false, error: `Customer with ID ${customerId} not found.` };
  }
  const customer = customerResult.data;

  const txResult = await getTransactionsDb(customerId);
  if (!txResult.success) {
    return txResult;
  }
  const transactions = txResult.data;

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
export async function generate_personalized_message(customerId, productType, channel = "WhatsApp") {
  const customerResult = await getCustomerByIdDb(customerId);
  if (!customerResult.success) {
    return { success: false, error: `Customer with ID ${customerId} not found.` };
  }
  const customer = customerResult.data;

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

/**
 * Accepts and validates an outreach message the LLM composed itself (used
 * only by the Tier 1 LLM agent — see llmAgentCore.js). Unlike
 * generate_personalized_message above, this does NOT synthesize copy from a
 * template; the model has already read the customer's real notes, score
 * justification, and transaction signals via prior tool calls in the same
 * run, and writes the message directly. This function's job is just to
 * validate it and attach the customer envelope, the same shape the
 * deterministic tier returns.
 * @param {string} customerId
 * @param {string} productType
 * @param {string} channel - "WhatsApp" | "Email"
 * @param {string} message - message text authored by the model
 */
export async function submit_personalized_message(customerId, productType, channel, message) {
  if (!message || typeof message !== "string" || !message.trim()) {
    return { success: false, error: "message is required and must be non-empty text." };
  }
  const customerResult = await getCustomerByIdDb(customerId);
  if (!customerResult.success) {
    return { success: false, error: `Customer with ID ${customerId} not found.` };
  }
  const customer = customerResult.data;

  return {
    success: true,
    customerId,
    customerName: customer.name,
    productType,
    channel,
    message: message.trim(),
    authoredBy: "llm"
  };
}
