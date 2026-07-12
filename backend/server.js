import express from "express";
import cors from "cors";
import { get_customers, get_customer_transactions, calculate_conversion_probability, generate_personalized_message } from "./src/agent/tools.js";
import { runAgent } from "./src/agent/agentCore.js";
import { runAgentLLM } from "./src/agent/llmAgentCore.js";
import { addCustomerDb, updateCustomerDb, addTransactionDb, getTransactionsDb, loginUserDb, getRmsDb, addRmDb, getDbStatus } from "./src/db/index.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const requestLogs = [];

// Logging middleware
app.use((req, res, next) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress
  };
  // Exclude health checks or logs endpoint to avoid polluting logs
  if (req.url !== "/health" && req.url !== "/api/logs") {
    requestLogs.push(logEntry);
    if (requestLogs.length > 50) requestLogs.shift();
  }
  console.log(`[${logEntry.timestamp}] ${logEntry.method} ${logEntry.url}`);
  next();
});

// 1. GET /api/customers - Query database customers
app.get("/api/customers", async (req, res) => {
  try {
    const filters = {};
    if (req.query.minBalance) filters.minBalance = parseInt(req.query.minBalance);
    if (req.query.minCreditScore) filters.minCreditScore = parseInt(req.query.minCreditScore);
    if (req.query.minIncome) filters.minIncome = parseInt(req.query.minIncome);
    if (req.query.segment) filters.segment = req.query.segment;
    if (req.query.occupation) filters.occupation = req.query.occupation;
    if (req.query.name) filters.name = req.query.name;

    const result = await get_customers(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. GET /api/transactions/:customerId - Get transaction logs for customer
app.get("/api/transactions/:customerId", async (req, res) => {
  try {
    const result = await get_customer_transactions(req.params.customerId);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. GET /api/score/:customerId/:productType - Calculate conversion likelihood
app.get("/api/score/:customerId/:productType", async (req, res) => {
  try {
    const result = await calculate_conversion_probability(req.params.customerId, req.params.productType);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. GET /api/outreach/:customerId/:productType/:channel - Generate message
app.get("/api/outreach/:customerId/:productType/:channel", async (req, res) => {
  try {
    const result = await generate_personalized_message(req.params.customerId, req.params.productType, req.params.channel);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. POST /api/agent - Process natural language query with ReAct Agent
// Primary path: an LLM (Groq) dynamically plans and calls tools via a real
// tool-use loop. Falls back to the deterministic heuristic pipeline when no
// API key is configured or the LLM call fails, so the feature keeps working
// offline/without credentials.
app.post("/api/agent", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: "Query string is required in request body." });
    }

    if (process.env.GROQ_API_KEY) {
      try {
        const result = await runAgentLLM(query);
        return res.json(result);
      } catch (llmError) {
        console.warn("LLM agent unavailable, falling back to deterministic engine:", llmError.message);
      }
    }

    const result = await runAgent(query);
    res.json({ ...result, engine: result.engine || "heuristic" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. GET /api/transactions - Get all transaction logs
app.get("/api/transactions", async (req, res) => {
  try {
    const result = await getTransactionsDb();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. POST /api/customers - Add a new CRM customer
app.post("/api/customers", async (req, res) => {
  try {
    const result = await addCustomerDb(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. PUT /api/customers/:id - Update an existing customer profile
app.put("/api/customers/:id", async (req, res) => {
  try {
    const result = await updateCustomerDb(req.params.id, req.body);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. POST /api/transactions - Log a new client transaction
app.post("/api/transactions", async (req, res) => {
  try {
    const result = await addTransactionDb(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. POST /api/auth/login - User Login Authentication
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password are required." });
    }
    const result = await loginUserDb(username, password);
    if (!result.success) {
      return res.status(401).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. GET /api/rms - List all Relationship Managers
app.get("/api/rms", async (req, res) => {
  try {
    const result = await getRmsDb();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. POST /api/rms - Create a new Relationship Manager
app.post("/api/rms", async (req, res) => {
  try {
    const result = await addRmDb(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/logs - Retrieve server memory logs
app.get("/api/logs", (req, res) => {
  res.json({ success: true, logs: requestLogs });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", database: getDbStatus(), timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Agentic AI System API Backend running on http://localhost:${PORT}`);
});
