import { API_BASE_URL } from "../config.js";
import React, { useState, useEffect } from "react";
import { Users, ShieldAlert, Award, ArrowUpRight, DollarSign } from "lucide-react";
import { mockCustomers, mockTransactions } from "../agent/mockDatabase.js";

export default function DashboardMetrics({ setActiveTab, setInitialQuery }) {
  const [customers, setCustomers] = useState(mockCustomers);
  const [transactions, setTransactions] = useState(mockTransactions);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const custRes = await fetch(`${API_BASE_URL}/api/customers`);
        if (custRes.ok) {
          const custData = await custRes.json();
          if (custData.success) setCustomers(custData.data);
        }
      } catch {
        console.warn("Backend offline. Using local array data for dashboard metrics.");
      }

      try {
        const txRes = await fetch(`${API_BASE_URL}/api/transactions`);
        if (txRes.ok) {
          const txData = await txRes.json();
          if (txData.success) setTransactions(txData.data);
        }
      } catch {
        console.warn("Backend offline. Using local array data for transaction dashboard metrics.");
      }
    };
    fetchData();
  }, []);

  // Compute Dynamic Metrics
  const totalBalance = customers.reduce((sum, c) => sum + (c.totalBalance || 0), 0);
  const avgCreditScore = Math.round(customers.reduce((sum, c) => sum + (c.creditScore || 0), 0) / (customers.length || 1));
  const riskFlagged = customers.filter(c => c.creditScore < 650).length;

  const stats = [
    { name: "Total CRM Customers", value: customers.length.toString(), icon: Users, change: "+12% this month", positive: true },
    { name: "Total Portfolio Assets", value: `$${(totalBalance / 1000000).toFixed(2)}M`, icon: DollarSign, change: "Managed assets under custody", positive: true },
    { name: "Avg. Credit Score", value: avgCreditScore.toString(), icon: Award, change: "Standard low default risk", positive: true },
    { name: "Risk Flagged Accounts", value: riskFlagged.toString(), icon: ShieldAlert, change: "Credit score < 650", positive: false }
  ];

  // Segment Counts
  const standardCount = customers.filter(c => c.segment === "Standard").length;
  const highValueCount = customers.filter(c => c.segment === "High Value").length;
  const ultraHnwCount = customers.filter(c => c.segment === "Ultra HNW").length;
  const totalCount = customers.length || 1;

  // Donut Angles calculations
  const r = 50;
  const circ = 2 * Math.PI * r; // ~314.16
  
  const pctStandard = standardCount / totalCount;
  const pctHighValue = highValueCount / totalCount;
  const pctUltraHnw = ultraHnwCount / totalCount;

  const strokeStandard = circ * pctStandard;
  const strokeHighValue = circ * pctHighValue;
  const strokeUltraHnw = circ * pctUltraHnw;

  const offsetStandard = 0;
  const offsetHighValue = strokeStandard;
  const offsetUltraHnw = strokeStandard + strokeHighValue;

  // Category counts for Transactions
  const categoryCounts = {};
  transactions.forEach(t => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  });

  const categories = Object.keys(categoryCounts).map(cat => ({
    name: cat,
    count: categoryCounts[cat]
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  const maxCatCount = Math.max(...categories.map(c => c.count), 1);

  const triggerQuery = (q) => {
    setInitialQuery(q);
    setActiveTab("agent");
  };

  const recentCampaigns = [
    { id: "act-1", customer: "Elena Rostova", product: "Travel Elite Credit Card", type: "travel", action: "WhatsApp Draft Generated", date: "Today, 11:20 AM" },
    { id: "act-2", customer: "William Patel", product: "Wealth Advisory", type: "wealth", action: "Advisory Pitch Prepared", date: "Today, 09:15 AM" },
    { id: "act-3", customer: "James Anderson", product: "Personal Loan Refinance", type: "loan", action: "WhatsApp Message Dispatched", date: "Yesterday, 04:30 PM" },
    { id: "act-4", customer: "David Chen", product: "Wealth Advisory", type: "wealth", action: "Customer Profile Scored (90%)", date: "Yesterday, 02:10 PM" }
  ];

  return (
    <div style={{ overflowY: "auto", flex: 1, paddingBottom: "2rem" }}>
      <div className="card-header" style={{ marginBottom: "1.5rem", borderBottom: "none" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: "700" }}>RM Dashboard Overview</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Real-time analytics and predictive performance for your client portfolio.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="dashboard-grid">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div className="glass-card metric-card" key={i}>
              <div className="metric-info">
                <h3>{stat.name}</h3>
                <div className="value">{stat.value}</div>
                <div className={`change ${stat.positive ? "positive" : "negative"}`}>
                  {stat.change}
                </div>
              </div>
              <div className="metric-icon-wrapper">
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-sections">
        {/* Left Section: Visual Interactive SVG Charts */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Charts Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            
            {/* Donut Chart */}
            <div className="glass-card chart-container" style={{ padding: "1.5rem", minHeight: "310px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", fontFamily: "var(--font-display)" }}>Client Segment Distribution</h3>
              
              <div className="chart-container" style={{ width: "160px", height: "160px" }}>
                <svg width="100%" height="100%" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                  {/* Standard segment */}
                  <circle
                    cx="60" cy="60" r={r}
                    fill="transparent"
                    stroke="var(--color-purple)"
                    strokeWidth="10"
                    strokeDasharray={`${strokeStandard} ${circ - strokeStandard}`}
                    strokeDashoffset={-offsetStandard}
                    style={{ transition: "all 0.5s ease" }}
                  />
                  {/* High Value segment */}
                  <circle
                    cx="60" cy="60" r={r}
                    fill="transparent"
                    stroke="var(--color-primary)"
                    strokeWidth="10"
                    strokeDasharray={`${strokeHighValue} ${circ - strokeHighValue}`}
                    strokeDashoffset={-offsetHighValue}
                    style={{ transition: "all 0.5s ease" }}
                  />
                  {/* Ultra HNW segment */}
                  <circle
                    cx="60" cy="60" r={r}
                    fill="transparent"
                    stroke="var(--color-success)"
                    strokeWidth="10"
                    strokeDasharray={`${strokeUltraHnw} ${circ - strokeUltraHnw}`}
                    strokeDashoffset={-offsetUltraHnw}
                    style={{ transition: "all 0.5s ease" }}
                  />
                </svg>
                
                <div className="donut-label">
                  <div className="number">{customers.length}</div>
                  <div className="label">Total Clients</div>
                </div>
              </div>

              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: "var(--color-success)" }}></div>
                  <span>Ultra HNW ({ultraHnwCount})</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: "var(--color-primary)" }}></div>
                  <span>High Value ({highValueCount})</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: "var(--color-purple)" }}></div>
                  <span>Standard ({standardCount})</span>
                </div>
              </div>
            </div>

            {/* Vertical Bar Chart - Transaction Categories */}
            <div className="glass-card" style={{ padding: "1.5rem", minHeight: "310px", display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.5rem", fontFamily: "var(--font-display)" }}>Top Transaction Activity</h3>
              
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {categories.map((cat, idx) => {
                  const percent = Math.round((cat.count / maxCatCount) * 100);
                  let color = "var(--text-muted)";
                  if (cat.name === "Salary" || cat.name === "Practice Revenue") color = "var(--color-success)";
                  else if (cat.name === "Travel") color = "var(--color-primary)";
                  else if (cat.name === "Investment") color = "var(--color-purple)";
                  else if (cat.name === "Dining" || cat.name === "Shopping") color = "var(--color-warning)";

                  return (
                    <div key={idx}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem", color: "var(--text-secondary)" }}>
                        <span style={{ fontWeight: 500 }}>{cat.name}</span>
                        <span>{cat.count} tx logs</span>
                      </div>
                      <div style={{ height: "8px", background: "rgba(255,255,255,0.03)", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ 
                          width: `${percent}%`, 
                          height: "100%", 
                          background: color, 
                          boxShadow: `0 0 10px ${color}80`,
                          borderRadius: "4px",
                          transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)"
                        }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-card recent-activity-card" style={{ height: "270px" }}>
            <div className="card-header">
              <h2>Recent Campaign Activities</h2>
              <button className="trace-speed-btn" onClick={() => setActiveTab("leads")}>
                View All Leads
              </button>
            </div>
            <div className="activity-list">
              {recentCampaigns.map((item) => (
                <div className="activity-item" key={item.id}>
                  <div className={`activity-badge ${item.type}`}>
                    <ArrowUpRight size={16} />
                  </div>
                  <div className="activity-details">
                    <div className="activity-title">{item.customer}</div>
                    <div className="activity-description">
                      {item.action} — <span style={{ color: "var(--color-primary)" }}>{item.product}</span>
                    </div>
                  </div>
                  <div className="activity-time">{item.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Section: AI Agent Console scan trigger actions */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
          <div>
            <div className="card-header">
              <h2>Agentic AI Agent Core</h2>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "1rem" }}>
              Our predictive agent leverages historical transactions, cash inflows, and profile triggers to score conversion likelihoods for:
            </p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
              <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ color: "var(--color-purple)", fontWeight: "bold" }}>●</span> Personal Loans (expiring terms, expansion plans)
              </li>
              <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ color: "var(--color-primary)", fontWeight: "bold" }}>●</span> Travel Elite Credit Card (airlines, hotel, forex fees)
              </li>
              <li style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ color: "var(--color-success)", fontWeight: "bold" }}>●</span> Wealth Advisory (cash liquidity, low interest yields)
              </li>
            </ul>

            {/* AI Yield Targets */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem", marginTop: "1rem" }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.75rem" }}>Campaign Lead Yield</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                    <span>Personal Loan (Avg: 85%)</span>
                    <span>8 Leads</span>
                  </div>
                  <div style={{ height: "6px", background: "var(--bg-input)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: "85%", height: "100%", background: "var(--color-purple)", boxShadow: "0 0 8px var(--color-purple-glow)" }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                    <span>Travel Elite Card (Avg: 78%)</span>
                    <span>6 Leads</span>
                  </div>
                  <div style={{ height: "6px", background: "var(--bg-input)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: "78%", height: "100%", background: "var(--color-primary)", boxShadow: "0 0 8px var(--color-primary-glow)" }}></div>
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                    <span>Wealth Advisory (Avg: 92%)</span>
                    <span>4 Leads</span>
                  </div>
                  <div style={{ height: "6px", background: "var(--bg-input)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: "92%", height: "100%", background: "var(--color-success)", boxShadow: "0 0 8px var(--color-success-glow)" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.25rem" }}>
            <button 
              className="btn btn-secondary" 
              style={{ width: "100%", fontSize: "0.8rem", padding: "0.4rem 0.75rem", display: "flex", justifyContent: "space-between", borderColor: "var(--color-purple-glow)", background: "var(--color-purple-glow)" }}
              onClick={() => triggerQuery("Find personal loan candidates with credit score > 700")}
            >
              <span>🔍 Scan Personal Loans</span>
              <span style={{ color: "var(--color-purple)", fontSize: "0.7rem", fontWeight: "bold" }}>Launch →</span>
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ width: "100%", fontSize: "0.8rem", padding: "0.4rem 0.75rem", display: "flex", justifyContent: "space-between", borderColor: "var(--color-primary-glow)", background: "var(--color-primary-glow)" }}
              onClick={() => triggerQuery("Identify frequent flyer profiles for premium Travel Elite Card upgrades with credit scores above 700")}
            >
              <span>✈️ Scan Travel Cards</span>
              <span style={{ color: "var(--color-primary)", fontSize: "0.7rem", fontWeight: "bold" }}>Launch →</span>
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ width: "100%", fontSize: "0.8rem", padding: "0.4rem 0.75rem", display: "flex", justifyContent: "space-between", borderColor: "var(--color-success-glow)", background: "var(--color-success-glow)" }}
              onClick={() => triggerQuery("Find high net-worth individuals with balances over $100k for wealth advisory campaigns and generate outreach")}
            >
              <span>💼 Scan Wealth Advisory</span>
              <span style={{ color: "var(--color-success)", fontSize: "0.7rem", fontWeight: "bold" }}>Launch →</span>
            </button>
            
            <button 
              className="btn btn-primary" 
              style={{ width: "100%", marginTop: "0.5rem", background: "linear-gradient(135deg, var(--color-primary) 0%, #3b82f6 100%)", color: "#000", padding: "0.5rem" }}
              onClick={() => setActiveTab("agent")}
            >
              Launch Custom Console
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
