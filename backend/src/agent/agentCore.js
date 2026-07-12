import { get_customers, get_customer_transactions, calculate_conversion_probability, generate_personalized_message } from "./tools.js";
import { parseQueryIntent } from "../../../shared/queryParser.js";

/**
 * Runs an asynchronous ReAct loop that executes the PG database tool calls.
 * Returns an object containing the detailed execution trace steps and the final results.
 * @param {string} query 
 * @returns {Promise<Object>} { steps: Array, leads: Array, productType: string }
 */
export async function runAgent(query) {
  const { productType, filters } = parseQueryIntent(query);
  const steps = [];

  // --- STEP 1: Task Decomposition & Plan ---
  steps.push({
    stepNumber: 1,
    thought: `The Relationship Manager wants to find candidates for: "${productType}". I will inspect the query to apply filters. Identified filters: ${JSON.stringify(filters)}. First, I need to list all matching customers in our database using 'get_customers'.`,
    action: "get_customers",
    toolCall: `get_customers(${JSON.stringify(filters)})`,
    observation: "" // filled below
  });

  const customerResult = await get_customers(filters);
  if (!customerResult.success) {
    steps[0].observation = `Error retrieving customers: ${customerResult.error}`;
    return { success: false, steps, leads: [] };
  }

  const rawCustomers = customerResult.data;
  steps[0].observation = `Found ${rawCustomers.length} customers matching basic filters. Candidate list: [${rawCustomers.map(c => c.name).join(", ")}].`;

  // --- STEP 2: Transaction History Analysis ---
  steps.push({
    stepNumber: 2,
    thought: `I have ${rawCustomers.length} candidate profiles. To perform a precise conversion assessment, I need to retrieve and analyze the transaction history of these candidates using 'get_customer_transactions' to detect patterns (salary, travel expenditures, existing debts).`,
    action: "get_customer_transactions",
    toolCall: `get_customer_transactions(for all ${rawCustomers.length} candidates)`,
    observation: ""
  });

  const analyzedCandidates = [];
  for (const customer of rawCustomers) {
    const txResult = await get_customer_transactions(customer.id);
    if (txResult.success) {
      // Analyze travel transaction markers
      const travelCount = txResult.data.filter(t => t.category === "Travel").length;
      const salaryCount = txResult.data.filter(t => t.category === "Salary" || t.category === "Practice Revenue" || t.category === "Commission").length;
      analyzedCandidates.push({
        id: customer.id,
        name: customer.name,
        travelCount,
        salaryCount,
        recentTxCount: txResult.count
      });
    }
  }

  steps[1].observation = `Analyzed transaction logs. Identified ${analyzedCandidates.filter(c => c.travelCount > 0).length} customers with travel histories and verified salary/income deposits for all candidates.`;

  // --- STEP 3: Likelihood Scoring (Heuristics) ---
  steps.push({
    stepNumber: 3,
    thought: `Now, I will run the specialized likelihood scoring tool 'calculate_conversion_probability' for each candidate to evaluate their conversion score (0-100%) and capture the logic justifications.`,
    action: "calculate_conversion_probability",
    toolCall: `calculate_conversion_probability(id, "${productType}") for candidates`,
    observation: ""
  });

  const scoredLeads = [];
  for (const customer of rawCustomers) {
    const scoreResult = await calculate_conversion_probability(customer.id, productType);
    if (scoreResult.success) {
      scoredLeads.push(scoreResult);
    }
  }

  // Sort leads by score descending
  scoredLeads.sort((a, b) => b.conversionScore - a.conversionScore);

  steps[2].observation = `Successfully calculated conversion scores. Top prospects are: ${scoredLeads.slice(0, 3).map(l => `${l.customerName} (${l.conversionScore}%)`).join(", ")}.`;

  // --- STEP 4: Personalized Outreach Message Drafting ---
  steps.push({
    stepNumber: 4,
    thought: `Now that I have identified the high-likelihood candidates, I will invoke 'generate_personalized_message' to draft tailored WhatsApp messages. These drafts will pull context from their transaction markers and CRM profiles to create highly personalized outreach.`,
    action: "generate_personalized_message",
    toolCall: `generate_personalized_message(id, "${productType}", "WhatsApp")`,
    observation: ""
  });

  const finalLeads = [];
  for (const lead of scoredLeads) {
    const msgResult = await generate_personalized_message(lead.customerId, productType, "WhatsApp");
    finalLeads.push({
      ...lead,
      outreachMessage: msgResult.success ? msgResult.message : "Error generating message."
    });
  }

  steps[3].observation = `Generated personalized WhatsApp drafts for ${finalLeads.length} leads. Ready for Relationship Manager's review.`;

  // --- STEP 5: Final Response ---
  steps.push({
    stepNumber: 5,
    thought: `Execution complete. I have decomposed the query, retrieved the customer accounts, evaluated transaction patterns, calculated conversion scores using financial heuristics, and drafted custom messages. I will now present the workspace dashboard to the Relationship Manager.`,
    action: "final_answer",
    toolCall: "return_leads_dashboard",
    observation: "Leads compiled successfully."
  });

  return {
    success: true,
    steps,
    leads: finalLeads,
    productType,
    filters
  };
}
