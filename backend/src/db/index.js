import pg from "pg";
import dotenv from "dotenv";
import { mockCustomers, mockTransactions, mockUsers } from "../agent/mockDatabase.js";

dotenv.config();

const { Pool } = pg;

let pool = null;
let usePostgres = false;

// Create PG connection pool
try {
  const connectionString = process.env.DATABASE_URL;
  pool = connectionString 
    ? new Pool({ connectionString, ssl: { rejectUnauthorized: false } })
    : new Pool({
        user: process.env.DB_USER || process.env.PGUSER || "postgres",
        password: process.env.DB_PASSWORD || process.env.PGPASSWORD || "postgres",
        host: process.env.DB_HOST || process.env.PGHOST || "localhost",
        port: parseInt(process.env.DB_PORT || process.env.PGPORT || "5432"),
        database: process.env.DB_NAME || process.env.PGDATABASE || "observebank"
      });
} catch (err) {
  console.warn("⚠️ Failed to initialize Postgres Pool. Falling back to local Mock Arrays.");
}

// Test connection on startup
if (pool) {
  try {
    const client = await pool.connect();
    console.log("✅ Postgres Database connected successfully.");
    client.release();
    usePostgres = true;
  } catch (err) {
    console.warn("⚠️ PostgreSQL connection failed. Express server will run with offline mock database array fallback.", err.message);
    usePostgres = false;
  }
}

// 1. Fetch Customers with optional filters
export async function getCustomersDb(filters = {}) {
  if (!usePostgres) {
    // Local fallback
    let results = [...mockCustomers];
    if (filters.minBalance !== undefined) results = results.filter(c => c.totalBalance >= filters.minBalance);
    if (filters.minCreditScore !== undefined) results = results.filter(c => c.creditScore >= filters.minCreditScore);
    if (filters.minIncome !== undefined) results = results.filter(c => c.annualIncome >= filters.minIncome);
    if (filters.segment !== undefined && filters.segment !== "") results = results.filter(c => c.segment.toLowerCase() === filters.segment.toLowerCase());
    if (filters.riskProfile !== undefined && filters.riskProfile !== "") results = results.filter(c => c.riskProfile.toLowerCase() === filters.riskProfile.toLowerCase());
    if (filters.occupation !== undefined && filters.occupation !== "") results = results.filter(c => c.occupation.toLowerCase().includes(filters.occupation.toLowerCase()));
    if (filters.name !== undefined && filters.name !== "") results = results.filter(c => c.name.toLowerCase().includes(filters.name.toLowerCase()));
    return { success: true, count: results.length, data: results };
  }

  try {
    let queryText = "SELECT * FROM customers WHERE 1=1";
    const queryParams = [];
    let paramIndex = 1;

    if (filters.minBalance !== undefined) {
      queryText += ` AND total_balance >= $${paramIndex}`;
      queryParams.push(filters.minBalance);
      paramIndex++;
    }
    if (filters.minCreditScore !== undefined) {
      queryText += ` AND credit_score >= $${paramIndex}`;
      queryParams.push(filters.minCreditScore);
      paramIndex++;
    }
    if (filters.minIncome !== undefined) {
      queryText += ` AND annual_income >= $${paramIndex}`;
      queryParams.push(filters.minIncome);
      paramIndex++;
    }
    if (filters.segment !== undefined && filters.segment !== "") {
      queryText += ` AND LOWER(segment) = LOWER($${paramIndex})`;
      queryParams.push(filters.segment);
      paramIndex++;
    }
    if (filters.riskProfile !== undefined && filters.riskProfile !== "") {
      queryText += ` AND LOWER(risk_profile) = LOWER($${paramIndex})`;
      queryParams.push(filters.riskProfile);
      paramIndex++;
    }
    if (filters.occupation !== undefined && filters.occupation !== "") {
      queryText += ` AND LOWER(occupation) LIKE LOWER($${paramIndex})`;
      queryParams.push(`%${filters.occupation}%`);
      paramIndex++;
    }
    if (filters.name !== undefined && filters.name !== "") {
      queryText += ` AND LOWER(name) LIKE LOWER($${paramIndex})`;
      queryParams.push(`%${filters.name}%`);
      paramIndex++;
    }

    const { rows } = await pool.query(queryText, queryParams);
    
    // Map underscore fields back to camelCase for compatibility with frontend components
    const mapped = rows.map(r => ({
      id: r.id,
      name: r.name,
      age: r.age,
      occupation: r.occupation,
      creditScore: r.credit_score,
      annualIncome: parseFloat(r.annual_income),
      totalBalance: parseFloat(r.total_balance),
      segment: r.segment,
      activeProducts: r.active_products,
      email: r.email,
      phone: r.phone,
      riskProfile: r.risk_profile,
      monthlySavingsRate: r.monthly_savings_rate,
      lastContacted: r.last_contacted ? new Date(r.last_contacted).toISOString().split('T')[0] : null,
      notes: r.notes
    }));

    return { success: true, count: mapped.length, data: mapped };
  } catch (error) {
    console.error("Postgres Query Error:", error);
    return { success: false, error: error.message };
  }
}

// 2. Fetch Customer Transactions
export async function getTransactionsDb(customerId = null) {
  if (!usePostgres) {
    let results = [...mockTransactions];
    if (customerId) {
      results = results.filter(t => t.customerId === customerId);
    }
    return { success: true, count: results.length, data: results };
  }

  try {
    let queryText = "SELECT * FROM transactions";
    const queryParams = [];
    if (customerId) {
      queryText += " WHERE customer_id = $1";
      queryParams.push(customerId);
    }

    const { rows } = await pool.query(queryText, queryParams);
    const mapped = rows.map(r => ({
      id: r.id,
      customerId: r.customer_id,
      date: r.date,
      description: r.description,
      amount: parseFloat(r.amount),
      type: r.type,
      category: r.category
    }));

    return { success: true, count: mapped.length, data: mapped };
  } catch (error) {
    console.error("Postgres Query Error:", error);
    return { success: false, error: error.message };
  }
}

// 3. Find Customer by ID
export async function getCustomerByIdDb(id) {
  if (!usePostgres) {
    const cust = mockCustomers.find(c => c.id === id);
    return cust ? { success: true, data: cust } : { success: false, error: "Customer not found." };
  }

  try {
    const { rows } = await pool.query("SELECT * FROM customers WHERE id = $1", [id]);
    if (rows.length === 0) return { success: false, error: "Customer not found." };
    
    const r = rows[0];
    const mapped = {
      id: r.id,
      name: r.name,
      age: r.age,
      occupation: r.occupation,
      creditScore: r.credit_score,
      annualIncome: parseFloat(r.annual_income),
      totalBalance: parseFloat(r.total_balance),
      segment: r.segment,
      activeProducts: r.active_products,
      email: r.email,
      phone: r.phone,
      riskProfile: r.risk_profile,
      monthlySavingsRate: r.monthly_savings_rate,
      lastContacted: r.last_contacted ? new Date(r.last_contacted).toISOString().split('T')[0] : null,
      notes: r.notes
    };
    return { success: true, data: mapped };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 4. Add new customer
export async function addCustomerDb(customer) {
  if (!usePostgres) {
    const newCust = {
      ...customer,
      id: customer.id || `CUST${String(mockCustomers.length + 1).padStart(3, "0")}`,
      activeProducts: customer.activeProducts || [],
    };
    mockCustomers.push(newCust);
    return { success: true, data: newCust };
  }

  try {
    const id = customer.id || `CUST${Date.now()}`;
    const activeProducts = customer.activeProducts || [];
    const queryText = `
      INSERT INTO customers (id, name, age, occupation, credit_score, annual_income, total_balance, segment, active_products, email, phone, risk_profile, monthly_savings_rate, last_contacted, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    const { rows } = await pool.query(queryText, [
      id,
      customer.name,
      parseInt(customer.age),
      customer.occupation,
      parseInt(customer.creditScore || 700),
      parseFloat(customer.annualIncome || 0),
      parseFloat(customer.totalBalance || 0),
      customer.segment || "Standard",
      activeProducts,
      customer.email,
      customer.phone,
      customer.riskProfile || "Moderate",
      parseInt(customer.monthlySavingsRate || 15),
      customer.lastContacted || new Date().toISOString().split("T")[0],
      customer.notes || ""
    ]);

    const r = rows[0];
    return {
      success: true,
      data: {
        id: r.id,
        name: r.name,
        age: r.age,
        occupation: r.occupation,
        creditScore: r.credit_score,
        annualIncome: parseFloat(r.annual_income),
        totalBalance: parseFloat(r.total_balance),
        segment: r.segment,
        activeProducts: r.active_products,
        email: r.email,
        phone: r.phone,
        riskProfile: r.risk_profile,
        monthlySavingsRate: r.monthly_savings_rate,
        lastContacted: r.last_contacted ? new Date(r.last_contacted).toISOString().split('T')[0] : null,
        notes: r.notes
      }
    };
  } catch (error) {
    console.error("Postgres Add Customer Error:", error);
    return { success: false, error: error.message };
  }
}

// 5. Update customer profile
export async function updateCustomerDb(id, updates) {
  if (!usePostgres) {
    const index = mockCustomers.findIndex(c => c.id === id);
    if (index === -1) return { success: false, error: "Customer not found." };
    mockCustomers[index] = { ...mockCustomers[index], ...updates };
    return { success: true, data: mockCustomers[index] };
  }

  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const keyMap = {
      name: "name",
      age: "age",
      occupation: "occupation",
      creditScore: "credit_score",
      annualIncome: "annual_income",
      totalBalance: "total_balance",
      segment: "segment",
      activeProducts: "active_products",
      email: "email",
      phone: "phone",
      riskProfile: "risk_profile",
      monthlySavingsRate: "monthly_savings_rate",
      lastContacted: "last_contacted",
      notes: "notes"
    };

    for (const [key, val] of Object.entries(updates)) {
      if (keyMap[key]) {
        fields.push(`${keyMap[key]} = $${paramIndex}`);
        if (key === "age" || key === "creditScore" || key === "monthlySavingsRate") {
          values.push(parseInt(val));
        } else if (key === "annualIncome" || key === "totalBalance") {
          values.push(parseFloat(val));
        } else {
          values.push(val);
        }
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return { success: false, error: "No valid fields to update." };
    }

    values.push(id);
    const queryText = `
      UPDATE customers 
      SET ${fields.join(", ")} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;

    const { rows } = await pool.query(queryText, values);
    if (rows.length === 0) return { success: false, error: "Customer not found." };

    const r = rows[0];
    return {
      success: true,
      data: {
        id: r.id,
        name: r.name,
        age: r.age,
        occupation: r.occupation,
        creditScore: r.credit_score,
        annualIncome: parseFloat(r.annual_income),
        totalBalance: parseFloat(r.total_balance),
        segment: r.segment,
        activeProducts: r.active_products,
        email: r.email,
        phone: r.phone,
        riskProfile: r.risk_profile,
        monthlySavingsRate: r.monthly_savings_rate,
        lastContacted: r.last_contacted ? new Date(r.last_contacted).toISOString().split('T')[0] : null,
        notes: r.notes
      }
    };
  } catch (error) {
    console.error("Postgres Update Customer Error:", error);
    return { success: false, error: error.message };
  }
}

// 6. Add transaction
export async function addTransactionDb(tx) {
  if (!usePostgres) {
    const newTx = {
      ...tx,
      id: tx.id || `T${String(mockTransactions.length + 1001).padStart(4, "0")}`,
      amount: parseFloat(tx.amount)
    };
    mockTransactions.push(newTx);
    return { success: true, data: newTx };
  }

  try {
    const id = tx.id || `T${Date.now()}`;
    const queryText = `
      INSERT INTO transactions (id, customer_id, date, description, amount, type, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const { rows } = await pool.query(queryText, [
      id,
      tx.customerId,
      tx.date || new Date().toISOString().split("T")[0],
      tx.description,
      parseFloat(tx.amount),
      tx.type || "withdrawal",
      tx.category || "General"
    ]);

    const r = rows[0];
    return {
      success: true,
      data: {
        id: r.id,
        customerId: r.customer_id,
        date: r.date,
        description: r.description,
        amount: parseFloat(r.amount),
        type: r.type,
        category: r.category
      }
    };
  } catch (error) {
    console.error("Postgres Add Transaction Error:", error);
    return { success: false, error: error.message };
  }
}

// 7. Authenticate user credentials
export async function loginUserDb(username, password) {
  if (!usePostgres) {
    const user = mockUsers.find(u => u.username === username && u.password === password);
    if (!user) return { success: false, error: "Invalid username or password." };
    return { success: true, data: { id: user.id, name: user.name, username: user.username, role: user.role, region: user.region, email: user.email, phone: user.phone, portfolioSize: user.portfolioSize, conversionRate: user.conversionRate } };
  }

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE username = $1 AND password = $2", [username, password]);
    if (rows.length === 0) return { success: false, error: "Invalid username or password." };
    const r = rows[0];
    return {
      success: true,
      data: {
        id: r.id,
        name: r.name,
        username: r.username,
        role: r.role,
        region: r.region,
        email: r.email,
        phone: r.phone,
        portfolioSize: r.portfolio_size,
        conversionRate: r.conversion_rate
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 8. List RMs
export async function getRmsDb() {
  if (!usePostgres) {
    const rms = mockUsers.filter(u => u.role === "rm");
    return { success: true, data: rms };
  }

  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE role = 'rm' ORDER BY name");
    const mapped = rows.map(r => ({
      id: r.id,
      name: r.name,
      username: r.username,
      role: r.role,
      region: r.region,
      email: r.email,
      phone: r.phone,
      portfolioSize: r.portfolio_size,
      conversionRate: r.conversion_rate
    }));
    return { success: true, data: mapped };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 9. Add new RM user
export async function addRmDb(rmData) {
  if (!usePostgres) {
    // Check if username already exists
    const exists = mockUsers.some(u => u.username === rmData.username);
    if (exists) return { success: false, error: "Username already exists." };
    
    const newRm = {
      ...rmData,
      id: `USR${String(mockUsers.length + 1).padStart(3, "0")}`,
      role: "rm",
      portfolioSize: rmData.portfolioSize || "₹0.00",
      conversionRate: rmData.conversionRate || "0.0%"
    };
    mockUsers.push(newRm);
    return { success: true, data: newRm };
  }

  try {
    const id = `USR${Date.now()}`;
    const queryText = `
      INSERT INTO users (id, name, username, password, role, region, email, phone, portfolio_size, conversion_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const { rows } = await pool.query(queryText, [
      id,
      rmData.name,
      rmData.username,
      rmData.password,
      "rm",
      rmData.region || "General",
      rmData.email,
      rmData.phone,
      rmData.portfolioSize || "₹0.00",
      rmData.conversionRate || "0.0%"
    ]);

    const r = rows[0];
    return {
      success: true,
      data: {
        id: r.id,
        name: r.name,
        username: r.username,
        role: r.role,
        region: r.region,
        email: r.email,
        phone: r.phone,
        portfolioSize: r.portfolio_size,
        conversionRate: r.conversion_rate
      }
    };
  } catch (error) {
    console.error("Postgres Add RM Error:", error);
    if (error.message.includes("unique constraint")) {
      return { success: false, error: "Username already exists." };
    }
    return { success: false, error: error.message };
  }
}

export function getDbStatus() {
  return usePostgres ? "PostgreSQL" : "Mock Array Fallback";
}
