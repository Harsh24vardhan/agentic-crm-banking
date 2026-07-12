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
