import { API_BASE_URL } from "../config.js";
import React, { useState, useEffect } from "react";
import { mockCustomers, mockTransactions } from "../../../shared/mockDatabase.js";
import { isValidName, isValidPhone } from "../../../shared/validators.js";
import { Search, UserPlus, X } from "lucide-react";
import { useToast } from "../context/ToastContext.jsx";

export default function DatabaseViewer({ setActiveTab, setInitialQuery }) {
  const { showSuccess, showError } = useToast();
  const [activeSubTab, setActiveSubTab] = useState("customers");
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState(mockCustomers);
  const [transactions, setTransactions] = useState(mockTransactions);

  // Modal States
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [selectedCustId, setSelectedCustId] = useState(null);

  // Form States
  const [addForm, setAddForm] = useState({
    name: "", age: "", occupation: "", creditScore: "720",
    annualIncome: "95000", totalBalance: "45000", segment: "High Value",
    email: "", phone: "", riskProfile: "Moderate", monthlySavingsRate: "20",
    notes: "", activeProducts: "Checking Account, Basic Savings"
  });

  const [editForm, setEditForm] = useState({
    name: "", age: "", occupation: "", creditScore: "",
    annualIncome: "", totalBalance: "", segment: "",
    email: "", phone: "", riskProfile: "", monthlySavingsRate: "",
    notes: "", activeProducts: ""
  });

  const [txForm, setTxForm] = useState({
    customerId: "", description: "", amount: "",
    type: "withdrawal", category: "Shopping"
  });

  const handleAnalyze = (name) => {
    setInitialQuery(`Find campaigns and generate outreach for customer ${name}`);
    setActiveTab("agent");
  };

  const refreshData = async () => {
    try {
      const custRes = await fetch(`${API_BASE_URL}/api/customers`);
      if (custRes.ok) {
        const custData = await custRes.json();
        if (custData.success) {
          setCustomers(custData.data);
        }
      }
    } catch (err) {
      console.warn("Backend offline. Using local React memory state for customers.", err);
    }

    try {
      const txRes = await fetch(`${API_BASE_URL}/api/transactions`);
      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData.success) {
          setTransactions(txData.data);
        }
      }
    } catch (err) {
      console.warn("Backend offline. Using local React memory state for transactions.", err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Actions
  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!isValidName(addForm.name)) {
      showError("Name can only contain letters, spaces, and ' . - characters — no numbers or symbols.");
      return;
    }
    if (!isValidPhone(addForm.phone)) {
      showError("Enter a valid Indian phone number, e.g. +91 98765 43210.");
      return;
    }
    const payload = {
      ...addForm,
      age: parseInt(addForm.age),
      creditScore: parseInt(addForm.creditScore),
      annualIncome: parseFloat(addForm.annualIncome),
      totalBalance: parseFloat(addForm.totalBalance),
      monthlySavingsRate: parseInt(addForm.monthlySavingsRate),
      activeProducts: addForm.activeProducts.split(",").map(p => p.trim())
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showSuccess(`Successfully added customer ${payload.name}`);
          refreshData();
          setShowAddCustomer(false);
          return;
        }
        showError(data.error || `Failed to add customer ${payload.name}.`);
        return;
      }
    } catch (err) {
      console.error(err);
    }

    // Local Fallback
    const localNewCust = {
      ...payload,
      id: `CUST${String(customers.length + 1).padStart(3, "0")}`
    };
    setCustomers(prev => [...prev, localNewCust]);
    mockCustomers.push(localNewCust);
    showSuccess(`Offline Mode: Added customer ${payload.name}`);
    setShowAddCustomer(false);
  };

  const handleEditCustomerClick = (cust) => {
    setSelectedCustId(cust.id);
    setEditForm({
      name: cust.name,
      age: cust.age.toString(),
      occupation: cust.occupation,
      creditScore: cust.creditScore.toString(),
      annualIncome: cust.annualIncome.toString(),
      totalBalance: cust.totalBalance.toString(),
      segment: cust.segment,
      email: cust.email,
      phone: cust.phone,
      riskProfile: cust.riskProfile || "Moderate",
      monthlySavingsRate: (cust.monthlySavingsRate || 15).toString(),
      notes: cust.notes || "",
      activeProducts: Array.isArray(cust.activeProducts) ? cust.activeProducts.join(", ") : cust.activeProducts
    });
    setShowEditCustomer(true);
  };

  const handleEditCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!isValidName(editForm.name)) {
      showError("Name can only contain letters, spaces, and ' . - characters — no numbers or symbols.");
      return;
    }
    if (!isValidPhone(editForm.phone)) {
      showError("Enter a valid Indian phone number, e.g. +91 98765 43210.");
      return;
    }
    const payload = {
      ...editForm,
      age: parseInt(editForm.age),
      creditScore: parseInt(editForm.creditScore),
      annualIncome: parseFloat(editForm.annualIncome),
      totalBalance: parseFloat(editForm.totalBalance),
      monthlySavingsRate: parseInt(editForm.monthlySavingsRate),
      activeProducts: editForm.activeProducts.split(",").map(p => p.trim())
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/customers/${selectedCustId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showSuccess(`Successfully updated profile for ${payload.name}`);
          refreshData();
          setShowEditCustomer(false);
          return;
        }
        showError(data.error || `Failed to update profile for ${payload.name}.`);
        return;
      }
    } catch (err) {
      console.error(err);
    }

    // Local Fallback
    setCustomers(prev => prev.map(c => c.id === selectedCustId ? { ...c, ...payload } : c));
    const mockIdx = mockCustomers.findIndex(c => c.id === selectedCustId);
    if (mockIdx !== -1) {
      mockCustomers[mockIdx] = { ...mockCustomers[mockIdx], ...payload };
    }
    showSuccess(`Offline Mode: Updated profile for ${payload.name}`);
    setShowEditCustomer(false);
  };

  const handleAddTxClick = (cust) => {
    setTxForm({
      customerId: cust.id,
      description: "",
      amount: "",
      type: "withdrawal",
      category: "Shopping"
    });
    setShowAddTx(true);
  };

  const handleAddTxSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...txForm,
      amount: parseFloat(txForm.amount),
      date: new Date().toISOString().split("T")[0]
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showSuccess(`Logged transaction of ₹${payload.amount}`);
          refreshData();
          setShowAddTx(false);
          return;
        }
        showError(data.error || "Failed to log transaction.");
        return;
      }
    } catch (err) {
      console.error(err);
    }

    // Local Fallback
    const localNewTx = {
      ...payload,
      id: `T${String(transactions.length + 1001).padStart(4, "0")}`
    };
    setTransactions(prev => [localNewTx, ...prev]);
    mockTransactions.push(localNewTx);
    showSuccess(`Offline Mode: Logged transaction of ₹${payload.amount}`);
    setShowAddTx(false);
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.occupation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredTransactions = transactions.filter((t) => {
    const cust = customers.find(c => c.id === t.customerId);
    const custName = cust ? cust.name : "";
    return (
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getSegmentBadgeClass = (segment) => {
    if (segment === "Ultra HNW") return "badge segment-ultra";
    if (segment === "High Value") return "badge segment-hnw";
    return "badge segment-standard";
  };

  return (
    <div className="glass-card" style={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <div className="card-header" style={{ border: "none", marginBottom: "0.5rem" }}>
        <div>
          <h2>CRM Core Databases</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
            Inspect client accounts and active transaction logs inside the bank's core system.
          </p>
        </div>
        
        {/* Actions & Search */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {activeSubTab === "customers" && (
            <button 
              id="add-customer-btn"
              className="btn btn-secondary" 
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", borderColor: "var(--border-color-active)", display: "flex", gap: "0.35rem" }}
              onClick={() => setShowAddCustomer(true)}
            >
              <UserPlus size={14} style={{ color: "var(--color-primary)" }} />
              <span style={{ color: "var(--color-primary)" }}>Add Client</span>
            </button>
          )}

          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", color: "var(--text-muted)" }} />
            <input
              type="text"
              id="db-search-input"
              placeholder={`Search ${activeSubTab}...`}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "0.4rem 0.75rem 0.4rem 2rem",
                fontSize: "0.8rem",
                color: "var(--text-primary)",
                outline: "none",
                width: "220px"
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="db-tabs">
        <button
          id="db-tab-btn-customers"
          className={`db-tab-btn ${activeSubTab === "customers" ? "active" : ""}`}
          onClick={() => {
            setActiveSubTab("customers");
            setSearchTerm("");
          }}
        >
          Customers Profile ({filteredCustomers.length})
        </button>
        <button
          id="db-tab-btn-transactions"
          className={`db-tab-btn ${activeSubTab === "transactions" ? "active" : ""}`}
          onClick={() => {
            setActiveSubTab("transactions");
            setSearchTerm("");
          }}
        >
          Transaction Ledgers ({filteredTransactions.length})
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {activeSubTab === "customers" ? (
          <div className="table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Client Name</th>
                  <th>Age</th>
                  <th>Occupation</th>
                  <th>Credit Score</th>
                  <th>Balance</th>
                  <th>Segment</th>
                  <th>Risk Profile</th>
                  <th>AI Copilot</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id}>
                    <td style={{ fontFamily: "monospace", color: "var(--color-primary)" }}>{cust.id}</td>
                    <td style={{ fontWeight: 600 }}>{cust.name}</td>
                    <td>{cust.age}</td>
                    <td>{cust.occupation}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: cust.creditScore >= 750 ? "var(--color-success)" : cust.creditScore >= 660 ? "var(--color-warning)" : "var(--color-danger)" }}>
                        {cust.creditScore}
                      </span>
                    </td>
                    <td>₹{cust.totalBalance.toLocaleString()}</td>
                    <td>
                      <span className={getSegmentBadgeClass(cust.segment)}>{cust.segment}</span>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      <span style={{
                        padding: "0.15rem 0.4rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        background: cust.riskProfile === "Conservative" ? "var(--color-success-glow)" : cust.riskProfile === "Aggressive" ? "var(--color-danger-glow)" : "var(--color-warning-glow)",
                        color: cust.riskProfile === "Conservative" ? "var(--color-success)" : cust.riskProfile === "Aggressive" ? "var(--color-danger)" : "var(--color-warning)"
                      }}>
                        {cust.riskProfile || "Moderate"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleAnalyze(cust.name)}
                        className="trace-speed-btn"
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderColor: "var(--border-color-active)", color: "var(--color-primary)", background: "var(--color-primary-glow)" }}
                      >
                        Score Client
                      </button>
                    </td>
                    <td style={{ display: "flex", gap: "0.5rem" }}>
                      <button 
                        id={`edit-cust-btn-${cust.id}`}
                        className="trace-speed-btn" 
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                        onClick={() => handleEditCustomerClick(cust)}
                      >
                        Edit
                      </button>
                      <button 
                        id={`add-tx-btn-${cust.id}`}
                        className="trace-speed-btn" 
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderColor: "var(--color-success-glow)", color: "var(--color-success)", background: "var(--color-success-glow)" }}
                        onClick={() => handleAddTxClick(cust)}
                      >
                        + Tx
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-container">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Tx ID</th>
                  <th>Client ID</th>
                  <th>Client Name</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => {
                  const cust = customers.find(c => c.id === tx.customerId);
                  return (
                    <tr key={tx.id}>
                      <td style={{ fontFamily: "monospace" }}>{tx.id}</td>
                      <td style={{ fontFamily: "monospace", color: "var(--color-primary)" }}>{tx.customerId}</td>
                      <td style={{ fontWeight: 600 }}>{cust ? cust.name : "Unknown"}</td>
                      <td>{tx.date}</td>
                      <td>
                        <span style={{
                          padding: "0.15rem 0.4rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          background: tx.category === "Travel" ? "var(--color-primary-glow)" : tx.category === "Salary" || tx.category === "Practice Revenue" ? "var(--color-success-glow)" : "var(--bg-item)",
                          color: tx.category === "Travel" ? "var(--color-primary)" : tx.category === "Salary" || tx.category === "Practice Revenue" ? "var(--color-success)" : "var(--text-secondary)"
                        }}>
                          {tx.category}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{tx.description}</td>
                      <td style={{ fontWeight: 600, color: tx.type === "deposit" ? "var(--color-success)" : "var(--text-primary)" }}>
                        {tx.type === "deposit" ? "+" : "-"}₹{Math.abs(tx.amount).toFixed(2)}
                      </td>
                      <td>
                        <span style={{ fontSize: "0.75rem", color: tx.type === "deposit" ? "var(--color-success)" : "var(--text-muted)" }}>
                          {tx.type.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD CUSTOMER MODAL */}
      {showAddCustomer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>Add CRM Customer Profile</h3>
              <X size={16} style={{ cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setShowAddCustomer(false)} />
            </div>
            <form onSubmit={handleAddCustomerSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" className="form-control" required value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input type="number" className="form-control" required value={addForm.age} onChange={e => setAddForm({...addForm, age: e.target.value})} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Occupation</label>
                  <input type="text" className="form-control" required value={addForm.occupation} onChange={e => setAddForm({...addForm, occupation: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Segment</label>
                  <select className="form-control" value={addForm.segment} onChange={e => setAddForm({...addForm, segment: e.target.value})}>
                    <option value="Standard">Standard</option>
                    <option value="High Value">High Value</option>
                    <option value="Ultra HNW">Ultra HNW</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Annual Income (₹)</label>
                  <input type="number" className="form-control" required value={addForm.annualIncome} onChange={e => setAddForm({...addForm, annualIncome: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Credit Score</label>
                  <input type="number" className="form-control" required value={addForm.creditScore} onChange={e => setAddForm({...addForm, creditScore: e.target.value})} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Total Balance (₹)</label>
                  <input type="number" className="form-control" required value={addForm.totalBalance} onChange={e => setAddForm({...addForm, totalBalance: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Risk Profile</label>
                  <select className="form-control" value={addForm.riskProfile} onChange={e => setAddForm({...addForm, riskProfile: e.target.value})}>
                    <option value="Conservative">Conservative</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Aggressive">Aggressive</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" className="form-control" required value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="text" className="form-control" required value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Active Products (comma separated)</label>
                <input type="text" className="form-control" value={addForm.activeProducts} onChange={e => setAddForm({...addForm, activeProducts: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Profile Notes</label>
                <textarea className="form-control" style={{ minHeight: "60px", resize: "vertical" }} value={addForm.notes} onChange={e => setAddForm({...addForm, notes: e.target.value})} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddCustomer(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, #3b82f6 100%)", color: "#000" }}>Save Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {showEditCustomer && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>Edit Customer Profile</h3>
              <X size={16} style={{ cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setShowEditCustomer(false)} />
            </div>
            <form onSubmit={handleEditCustomerSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" className="form-control" required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input type="number" className="form-control" required value={editForm.age} onChange={e => setEditForm({...editForm, age: e.target.value})} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Occupation</label>
                  <input type="text" className="form-control" required value={editForm.occupation} onChange={e => setEditForm({...editForm, occupation: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Segment</label>
                  <select className="form-control" value={editForm.segment} onChange={e => setEditForm({...editForm, segment: e.target.value})}>
                    <option value="Standard">Standard</option>
                    <option value="High Value">High Value</option>
                    <option value="Ultra HNW">Ultra HNW</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Annual Income (₹)</label>
                  <input type="number" className="form-control" required value={editForm.annualIncome} onChange={e => setEditForm({...editForm, annualIncome: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Credit Score</label>
                  <input type="number" className="form-control" required value={editForm.creditScore} onChange={e => setEditForm({...editForm, creditScore: e.target.value})} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Total Balance (₹)</label>
                  <input type="number" className="form-control" required value={editForm.totalBalance} onChange={e => setEditForm({...editForm, totalBalance: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Risk Profile</label>
                  <select className="form-control" value={editForm.riskProfile} onChange={e => setEditForm({...editForm, riskProfile: e.target.value})}>
                    <option value="Conservative">Conservative</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Aggressive">Aggressive</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" className="form-control" required value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="text" className="form-control" required value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Active Products (comma separated)</label>
                <input type="text" className="form-control" value={editForm.activeProducts} onChange={e => setEditForm({...editForm, activeProducts: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Profile Notes</label>
                <textarea className="form-control" style={{ minHeight: "60px", resize: "vertical" }} value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditCustomer(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, #3b82f6 100%)", color: "#000" }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG TRANSACTION MODAL */}
      {showAddTx && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: "400px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>Log Client Transaction</h3>
              <X size={16} style={{ cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setShowAddTx(false)} />
            </div>
            <form onSubmit={handleAddTxSubmit}>
              <div className="form-group">
                <label>Description</label>
                <input type="text" className="form-control" required placeholder="e.g. Whole Foods Market" value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input type="number" step="0.01" className="form-control" required placeholder="e.g. 85.50" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select className="form-control" value={txForm.type} onChange={e => setTxForm({...txForm, type: e.target.value})}>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="deposit">Deposit</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select className="form-control" value={txForm.category} onChange={e => setTxForm({...txForm, category: e.target.value})}>
                  <option value="Shopping">Shopping</option>
                  <option value="Travel">Travel</option>
                  <option value="Salary">Salary</option>
                  <option value="Dining">Dining</option>
                  <option value="Housing">Housing</option>
                  <option value="Investment">Investment</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Practice Revenue">Practice Revenue</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddTx(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
