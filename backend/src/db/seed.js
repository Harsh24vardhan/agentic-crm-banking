import pg from "pg";
import dotenv from "dotenv";
import { mockCustomers, mockTransactions } from "../agent/mockDatabase.js";

dotenv.config();

const { Client } = pg;

const client = new Client({
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: "postgres" // Connect to default database first to check/create the target database
});

async function runSeed() {
  try {
    await client.connect();
    console.log("🔌 Connected to PostgreSQL server.");

    const dbName = process.env.DB_NAME || "observebank";

    // 1. Create database if it doesn't exist
    const dbCheck = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (dbCheck.rowCount === 0) {
      console.log(`Database "${dbName}" not found. Creating...`);
      // CREATE DATABASE cannot run inside a transaction block, run it directly
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
    await client.end();

    // 2. Connect to the target database
    const dbClient = new Client({
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: dbName
    });

    await dbClient.connect();
    console.log(`🔌 Connected directly to database "${dbName}".`);

    // 3. Drop existing tables
    console.log("Dropping old tables if they exist...");
    await dbClient.query(`DROP TABLE IF EXISTS transactions CASCADE`);
    await dbClient.query(`DROP TABLE IF EXISTS customers CASCADE`);
    await dbClient.query(`DROP TABLE IF EXISTS users CASCADE`);

    // 4. Create users table
    console.log("Creating table \"users\"...");
    await dbClient.query(`
      CREATE TABLE users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL,
        region VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(30),
        portfolio_size VARCHAR(30) DEFAULT '$0.00',
        conversion_rate VARCHAR(30) DEFAULT '0.0%'
      )
    `);

    // 5. Create customers table
    console.log("Creating table \"customers\"...");
    await dbClient.query(`
      CREATE TABLE customers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        age INTEGER NOT NULL,
        occupation VARCHAR(100) NOT NULL,
        credit_score INTEGER NOT NULL,
        annual_income DECIMAL(15,2) NOT NULL,
        total_balance DECIMAL(15,2) NOT NULL,
        segment VARCHAR(50) NOT NULL,
        active_products TEXT[] NOT NULL,
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        risk_profile VARCHAR(30) NOT NULL DEFAULT 'Moderate',
        monthly_savings_rate INTEGER NOT NULL DEFAULT 15,
        last_contacted DATE,
        notes TEXT
      )
    `);

    // 6. Create transactions table
    console.log("Creating table \"transactions\"...");
    await dbClient.query(`
      CREATE TABLE transactions (
        id VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE CASCADE,
        date VARCHAR(30) NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        type VARCHAR(10) NOT NULL,
        category VARCHAR(50) NOT NULL
      )
    `);

    // 7. Insert default users
    console.log("Seeding default users...");
    await dbClient.query(`
      INSERT INTO users (id, name, username, password, role, region, email, phone, portfolio_size, conversion_rate)
      VALUES 
      ('USR001', 'System Administrator', 'admin', 'password123', 'admin', 'All Regions', 'admin@observebank.com', '+1 (555) 010-0000', '$0.00', '0.0%'),
      ('USR002', 'Sarah Connor', 'sarah', 'password123', 'rm', 'Northeast Region (NYC Head Office)', 'sconnor@observebank.com', '+1 (555) 012-9981', '$4.25M', '82.4%')
    `);

    // 8. Insert customers
    console.log(`Seeding ${mockCustomers.length} customers...`);
    for (const cust of mockCustomers) {
      await dbClient.query(`
        INSERT INTO customers (id, name, age, occupation, credit_score, annual_income, total_balance, segment, active_products, email, phone, risk_profile, monthly_savings_rate, last_contacted, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        cust.id,
        cust.name,
        cust.age,
        cust.occupation,
        cust.creditScore,
        cust.annualIncome,
        cust.totalBalance,
        cust.segment,
        cust.activeProducts,
        cust.email,
        cust.phone,
        cust.riskProfile || 'Moderate',
        cust.monthlySavingsRate || 15,
        cust.lastContacted || null,
        cust.notes || ''
      ]);
    }

    // 9. Insert transactions
    console.log(`Seeding ${mockTransactions.length} transactions...`);
    for (const tx of mockTransactions) {
      await dbClient.query(`
        INSERT INTO transactions (id, customer_id, date, description, amount, type, category)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        tx.id,
        tx.customerId,
        tx.date,
        tx.description,
        tx.amount,
        tx.type,
        tx.category
      ]);
    }

    console.log("✅ Database successfully seeded!");
    await dbClient.end();
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

runSeed();
