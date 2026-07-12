import Groq from "groq-sdk";
import { get_customers, get_customer_transactions, calculate_conversion_probability, submit_personalized_message } from "./tools.js";

// openai/gpt-oss-120b is Groq's current flagship tool-use model (their own
// recommended migration target after deprecating llama-3.3-70b-versatile).
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const MAX_ITERATIONS = 12;
// Conversation history is a client-held, lossy summary (see server.js/the
// frontend), not a full transcript replay — capped here too, defensively,
// since it feeds directly into the same shared per-minute token budget
// documented in the README's trade-offs.
const MAX_HISTORY_TURNS = 12;
const MAX_HISTORY_TURN_CHARS = 2000;

const SYSTEM_PROMPT = `You are an AI assistant helping a bank Relationship Manager (RM) identify high-potential customers and generate personalized outreach.

You have four tools backed by the bank's live CRM database:
- get_customers: search for customers matching filter criteria (balance, credit score, income, segment, risk profile, occupation, name)
- get_customer_transactions: pull a customer's transaction history to look for behavioral signals (travel spend, salary deposits, foreign fees, etc.)
- calculate_conversion_probability: run the bank's heuristic scoring model for a customer against a specific product
- submit_personalized_message: submit a WhatsApp or Email message that YOU have written for a specific customer and product

For the RM's request:
1. Determine which product they mean: "Personal Loan", "Travel Elite Credit Card", or "Wealth Advisory".
2. Call get_customers. For qualitative descriptors like "high-value", "premium", "HNW", or "ultra HNW", use the segment field ("High Value" / "Ultra HNW") — do NOT invent numeric balance/income/credit-score thresholds unless the RM's request states an explicit number. If you're unsure what filters apply, it's fine to call get_customers with no filters at all and evaluate the results yourself; that's cheaper than guessing thresholds and getting zero matches.
3. For candidates where it would sharpen your judgment, check get_customer_transactions (e.g. travel spend for a travel card pitch, salary/expiring-loan signals for a personal loan pitch). This is optional — skip it if the customer profile already gives you enough to score confidently.
4. Score genuine candidates with calculate_conversion_probability for the relevant product. Don't score customers who clearly don't fit the request. 2-4 well-chosen candidates is plenty.
5. For the strongest-scoring candidates, compose the outreach message yourself and submit it with submit_personalized_message on the requested channel (default WhatsApp). Write real copy grounded in at least one concrete, specific detail about that customer — their name, a fact from their profile notes, a transaction pattern, their risk profile, or a factor from their own score justification. Never reuse the same phrasing across different customers; two candidates with similar scores should still read like two different messages. WhatsApp: conversational tone, 2-4 sentences, at most one emoji. Email: start with a "Subject: ..." line, then a blank line, then a professional body. Every candidate you score should get a message — a score with no message is wasted work.
6. Once you've scored and drafted messages for the relevant candidates, stop calling tools and give the RM a short summary.

Briefly explain your reasoning before each tool call so the RM can follow your thought process. Be decisive and move quickly to scoring and messaging — you have a limited number of tool calls, so don't spend more than one or two calls exploring before committing to candidates.

You may also be given a short summary of earlier turns in this same conversation, before the RM's current message. Use it to resolve references like "the same customers", "now for wealth advisory", "only the ones above 700 credit score", or "what about James Chen". That summary is a compact recap, not a tool result — if the current request needs fresher or more detailed data than the summary contains, call the tools again rather than assuming old numbers still hold.`;

const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "get_customers",
      description: "Search the bank's CRM for customers matching filter criteria. Use this first to find candidates. All filters are optional and can be combined — omit any filter you're not sure about rather than guessing a number.",
      parameters: {
        type: "object",
        properties: {
          minBalance: { type: "number", description: "Minimum total account balance in rupees. Only set this if the RM's request gives an explicit number — for general terms like 'high-value' use the segment field instead." },
          minCreditScore: { type: "number", description: "Minimum credit score. Only set this if the RM's request gives an explicit number." },
          minIncome: { type: "number", description: "Minimum annual income in rupees. Only set this if the RM's request gives an explicit number." },
          segment: { type: "string", enum: ["Standard", "High Value", "Ultra HNW"], description: "Customer segment — the right filter for qualitative terms like 'high-value', 'premium', 'HNW', or 'ultra HNW' in the RM's request." },
          riskProfile: { type: "string", enum: ["Conservative", "Moderate", "Aggressive"], description: "Customer's risk tolerance" },
          occupation: { type: "string", description: "Free-text search on occupation" },
          name: { type: "string", description: "Free-text search on customer name" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_customer_transactions",
      description: "Fetch a customer's recent transaction history to look for behavioral signals (travel spending, salary deposits, foreign fees, etc.).",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "The customer's ID, e.g. CUST001" }
        },
        required: ["customerId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_conversion_probability",
      description: "Run the bank's heuristic scoring model to estimate how likely a customer is to convert for a given product. Returns a 0-100 score, a likelihood label, and the specific factors that drove the score.",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "The customer's ID" },
          productType: { type: "string", enum: ["Personal Loan", "Travel Elite Credit Card", "Wealth Advisory"], description: "The product to score conversion likelihood for" }
        },
        required: ["customerId", "productType"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "submit_personalized_message",
      description: "Submit a personalized outreach message that YOU write yourself for a specific customer and product. Only call this for customers already scored as good candidates. This tool only validates and records what you submit — it does not write the copy for you.",
      parameters: {
        type: "object",
        properties: {
          customerId: { type: "string", description: "The customer's ID" },
          productType: { type: "string", enum: ["Personal Loan", "Travel Elite Credit Card", "Wealth Advisory"], description: "The product being pitched" },
          channel: { type: "string", enum: ["WhatsApp", "Email"], description: "Outreach channel; defaults to WhatsApp" },
          message: { type: "string", description: "The full outreach message text, written by you. Must reference at least one concrete, specific detail about this customer (their name plus a real profile note, transaction pattern, or score factor) — not generic boilerplate. WhatsApp: conversational, 2-4 sentences. Email: begin with a 'Subject: ...' line, then a blank line, then the body." }
        },
        required: ["customerId", "productType", "channel", "message"]
      }
    }
  }
];

async function executeTool(name, input) {
  switch (name) {
    case "get_customers":
      return await get_customers(input);
    case "get_customer_transactions":
      return await get_customer_transactions(input.customerId);
    case "calculate_conversion_probability":
      return await calculate_conversion_probability(input.customerId, input.productType);
    case "submit_personalized_message":
      return await submit_personalized_message(input.customerId, input.productType, input.channel || "WhatsApp", input.message);
    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
}

// The trace log's Action line is meant to be a scannable call signature, not
// a wall of JSON — submit_personalized_message is the one tool whose full
// argument would otherwise dump the entire authored message inline. The full
// text is still what's used and is shown in full in the Outreach Preview
// panel; this is a display-only truncation.
function formatToolCall(name, input) {
  if (name === "submit_personalized_message") {
    const preview = (input.message || "").slice(0, 60);
    const ellipsis = (input.message || "").length > 60 ? "…" : "";
    return `submit_personalized_message(${input.customerId}, "${input.productType}", "${input.channel || "WhatsApp"}", message: "${preview}${ellipsis}")`;
  }
  return `${name}(${JSON.stringify(input)})`;
}

function summarizeObservation(name, result) {
  if (!result.success) return `Error: ${result.error || "tool call failed"}`;
  switch (name) {
    case "get_customers":
      return `Found ${result.count} matching customer${result.count === 1 ? "" : "s"}${result.count ? `: [${result.data.map(c => c.name).join(", ")}]` : ""}.`;
    case "get_customer_transactions":
      return `Retrieved ${result.count} transactions for ${result.customerName}.`;
    case "calculate_conversion_probability":
      return `${result.customerName} scored ${result.conversionScore}% (${result.likelihood}) for ${result.productType}.`;
    case "submit_personalized_message":
      return `Recorded a ${result.channel} message for ${result.customerName}, written by the model.`;
    default:
      return "Done.";
  }
}

/**
 * Prior conversation turns are a client-held, lossy summary (see server.js /
 * AgentConsole.jsx), not a raw tool-call transcript — so history stays
 * cheap in tokens even across a long conversation. Sanitized again here
 * since it lands directly in the Groq request payload.
 * @param {Array} history
 */
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(turn => turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string" && turn.content.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map(turn => ({ role: turn.role, content: turn.content.trim().slice(0, MAX_HISTORY_TURN_CHARS) }));
}

/**
 * Runs a real LLM-driven ReAct loop: the model decides which tools to call,
 * in what order, and how many times, based on the actual results of each
 * prior call — not a fixed script. Falls back to the deterministic pipeline
 * (agentCore.js) if this throws; see server.js.
 * @param {string} query
 * @param {Array<{role: "user"|"assistant", content: string}>} [history] prior turns of this conversation, oldest first
 * @returns {Promise<{success: boolean, steps: Array, leads: Array, productType: string, engine: string}>}
 */
export async function runAgentLLM(query, history = []) {
  // maxRetries: 0 is deliberate, not an oversight. groq-sdk defaults to 2
  // retries and, when the API returns a `retry-after`/`retry-after-ms`
  // header, sleeps for however long the header says before each retry —
  // observed directly during this project's own testing to be tens of
  // *minutes* under a daily-quota 429, not seconds. That single await
  // blocks this whole request, which is what actually made /api/agent feel
  // "slow": not the model, but the SDK silently honoring an arbitrarily
  // long server-suggested wait before we ever got a chance to fail over.
  // We already have a better fallback (the deterministic engine) than
  // "wait and try the same call again," so fail fast and let server.js's
  // try/catch hand off immediately instead.
  const client = new Groq({ maxRetries: 0, timeout: 30000 });
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...sanitizeHistory(history),
    { role: "user", content: query }
  ];
  const steps = [];
  const scoresByKey = new Map();
  const messagesByKey = new Map();
  let detectedProductType = null;
  let stepNumber = 0;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 4096,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto",
      // The heavy lifting (scoring math, message templates) happens in our
      // own deterministic tools; the model's job is orchestration, which
      // doesn't need deep reasoning. Low effort cuts per-turn latency a lot
      // without hurting tool-selection quality.
      reasoning_effort: "low"
    });

    const message = completion.choices[0].message;
    // gpt-oss-120b returns its chain-of-thought in `reasoning` (present
    // whenever tool_calls are made) rather than `content`.
    const thought = (message.reasoning || message.content || "").trim();
    const toolCalls = message.tool_calls || [];

    if (toolCalls.length === 0) {
      stepNumber++;
      steps.push({
        stepNumber,
        thought: thought || "Finished evaluating candidates.",
        action: "final_answer",
        toolCall: "return_leads_dashboard",
        observation: "Leads compiled successfully."
      });
      break;
    }

    messages.push(message);

    for (let idx = 0; idx < toolCalls.length; idx++) {
      const call = toolCalls[idx];
      const input = JSON.parse(call.function.arguments || "{}");
      stepNumber++;
      const result = await executeTool(call.function.name, input);

      if (call.function.name === "calculate_conversion_probability" && result.success) {
        const key = `${result.customerId}:${result.productType}`;
        scoresByKey.set(key, result);
        detectedProductType = detectedProductType || result.productType;
      }
      if (call.function.name === "submit_personalized_message" && result.success) {
        const key = `${result.customerId}:${result.productType}`;
        messagesByKey.set(key, result.message);
      }

      steps.push({
        stepNumber,
        thought: idx === 0 ? (thought || `Calling ${call.function.name}.`) : `(parallel call) ${call.function.name}`,
        action: call.function.name,
        toolCall: formatToolCall(call.function.name, input),
        observation: summarizeObservation(call.function.name, result)
      });

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result)
      });
    }

    if (iteration === MAX_ITERATIONS - 1) {
      steps.push({
        stepNumber: ++stepNumber,
        thought: "Reached the maximum reasoning depth for this request.",
        action: "final_answer",
        toolCall: "return_leads_dashboard",
        observation: "Leads compiled with partial analysis."
      });
    }
  }

  const leads = [];
  for (const [key, score] of scoresByKey.entries()) {
    const message = messagesByKey.get(key);
    if (message) {
      leads.push({ ...score, outreachMessage: message });
    }
  }
  leads.sort((a, b) => b.conversionScore - a.conversionScore);

  return {
    success: true,
    steps,
    leads,
    productType: detectedProductType || "Personal Loan",
    engine: "llm"
  };
}
