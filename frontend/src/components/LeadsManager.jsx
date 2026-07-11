import { API_BASE_URL } from "../config.js";
import React, { useState, useEffect } from "react";
import { mockCustomers } from "../agent/mockDatabase";
import { MessageSquare, PhoneCall, Send, Clipboard, CheckCircle, HelpCircle, Mail } from "lucide-react";
import { generate_personalized_message } from "../agent/tools";

export default function LeadsManager({ leads, activeProduct, setActiveTab, setInitialQuery }) {
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [editableMsg, setEditableMsg] = useState("");
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contactedStatus, setContactedStatus] = useState({}); // customerId -> boolean
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStep, setDispatchStep] = useState(0);
  const [outreachChannel, setOutreachChannel] = useState("WhatsApp");

  // Set default selected lead when leads update
  useEffect(() => {
    if (leads && leads.length > 0) {
      setSelectedLeadId(leads[0].customerId);
      setOutreachChannel("WhatsApp");
    } else {
      setSelectedLeadId(null);
      setEditableMsg("");
    }
  }, [leads]);

  // Load message copy based on lead and selected channel
  useEffect(() => {
    const selected = leads.find(l => l.customerId === selectedLeadId);
    if (!selected) return;

    const loadMessage = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/outreach/${selected.customerId}/${encodeURIComponent(selected.productType)}/${outreachChannel}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setEditableMsg(result.message);
            return;
          }
        }
      } catch (err) {
        console.warn("Backend API offline for outreach generation. Using local fallback.", err);
      }

      // Local fallback
      const msgResult = generate_personalized_message(selected.customerId, selected.productType, outreachChannel);
      if (msgResult.success) {
        setEditableMsg(msgResult.message);
      }
    };

    loadMessage();
  }, [selectedLeadId, outreachChannel, leads]);

  const handleSelectLead = (id) => {
    setSelectedLeadId(id);
  };

  const selectedLead = leads ? leads.find((l) => l.customerId === selectedLeadId) : null;
  const customerProfile = selectedLead ? mockCustomers.find((c) => c.id === selectedLead.customerId) : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(editableMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatch = () => {
    setShowDispatchModal(true);
  };

  const confirmDispatch = () => {
    setIsDispatching(true);
    setDispatchStep(1);

    setTimeout(() => {
      setDispatchStep(2);
    }, 600);

    setTimeout(() => {
      setDispatchStep(3);
    }, 1200);

    setTimeout(() => {
      setDispatchStep(4);
    }, 1800);

    setTimeout(() => {
      setIsDispatching(false);
      setShowDispatchModal(false);
      if (selectedLeadId) {
        setContactedStatus((prev) => ({ ...prev, [selectedLeadId]: true }));
      }
    }, 2400);
  };

  const exportToCSV = () => {
    if (!leads || leads.length === 0) return;
    
    // Construct CSV Header
    const headers = ["Customer ID", "Customer Name", "Product Type", "Conversion Score (%)", "Likelihood Match", "Outreach Message", "Status"];
    
    // Construct CSV Rows
    const csvRows = leads.map(l => {
      const isContacted = contactedStatus[l.customerId] ? "Contacted" : "Pending Outreach";
      const escapedMsg = (l.outreachMessage || "").replace(/"/g, '""');
      return [
        l.customerId,
        l.customerName,
        l.productType,
        l.conversionScore,
        l.likelihood,
        `"${escapedMsg}"`,
        isContacted
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `AgenticAI_Campaign_${(activeProduct || "Leads").replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getScoreClass = (score) => {
    if (score >= 75) return "score-high";
    if (score >= 45) return "score-medium";
    return "score-low";
  };

  if (!leads || leads.length === 0) {
    return (
      <div className="glass-card" style={{ height: "calc(100vh - 100px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="empty-placeholder">
          <MessageSquare className="empty-placeholder-icon" style={{ strokeWidth: 1 }} />
          <h3>No Campaign Leads Scored Yet</h3>
          <p style={{ fontSize: "0.85rem", maxWidth: "400px", marginBottom: "0.5rem" }}>
            The Leads Campaign Manager requires an active Agent scan. Please go to the <strong>Agent Console</strong>, choose or enter a search query, and run the agent to populate this view.
          </p>
          {setActiveTab && setInitialQuery && (
            <button 
              id="empty-leads-scan-btn"
              className="btn btn-primary" 
              style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, #3b82f6 100%)", color: "#000", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
              onClick={() => {
                setInitialQuery("Find personal loan candidates with credit score > 700");
                setActiveTab("agent");
              }}
            >
              Launch Sample Scan in Console
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="leads-manager-layout">
      {/* Leads list sidebar */}
      <div className="leads-sidebar">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 0 }}>
            Prospect Leads ({leads.length})
          </h3>
          <button 
            id="export-csv-campaign-btn"
            onClick={exportToCSV}
            className="trace-speed-btn"
            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderColor: "rgba(16, 185, 129, 0.3)", color: "var(--color-success)", background: "rgba(16, 185, 129, 0.04)" }}
          >
            Export CSV
          </button>
        </div>
        {leads.map((lead) => {
          const isContacted = contactedStatus[lead.customerId];
          return (
            <div
              key={lead.customerId}
              id={`lead-sidebar-item-${lead.customerId}`}
              className={`lead-item-card ${selectedLeadId === lead.customerId ? "selected" : ""}`}
              onClick={() => handleSelectLead(lead.customerId)}
            >
              <div className="lead-header">
                <span className="lead-name" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  {lead.customerName}
                  {isContacted && <CheckCircle size={14} style={{ color: "var(--color-success)" }} />}
                </span>
                <span className={`lead-score ${getScoreClass(lead.conversionScore)}`}>
                  {lead.conversionScore}%
                </span>
              </div>
              <div className="lead-meta">
                <span>Product: {lead.productType}</span>
                <span>{lead.likelihood} Match</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lead details and dispatch workspace */}
      <div className="glass-card lead-detail-workspace">
        {selectedLead && customerProfile ? (
          <>
            {/* Header info */}
            <div className="lead-detail-header">
              <div className="lead-title-area">
                <h2>{customerProfile.name}</h2>
                <div className="lead-subtitle">
                  {customerProfile.occupation} • ID: {customerProfile.id}
                </div>
              </div>
              <span className={`lead-score ${getScoreClass(selectedLead.conversionScore)}`} style={{ fontSize: "1.1rem", padding: "0.4rem 0.8rem" }}>
                {selectedLead.conversionScore}% Conversion Probability
              </span>
            </div>

            {/* Profile Grid */}
            <div className="lead-card-grid">
              <div className="detail-pill">
                <div className="detail-label">Annual Income</div>
                <div className="detail-value">${customerProfile.annualIncome.toLocaleString()}</div>
              </div>
              <div className="detail-pill">
                <div className="detail-label">Total Balance</div>
                <div className="detail-value">${customerProfile.totalBalance.toLocaleString()}</div>
              </div>
              <div className="detail-pill">
                <div className="detail-label">Credit Score</div>
                <div className="detail-value" style={{ color: customerProfile.creditScore >= 750 ? "var(--color-success)" : customerProfile.creditScore >= 660 ? "var(--color-warning)" : "var(--color-danger)" }}>
                  {customerProfile.creditScore}
                </div>
              </div>
              <div className="detail-pill">
                <div className="detail-label">Risk Tolerance</div>
                <div className="detail-value">{customerProfile.riskProfile}</div>
              </div>
            </div>

            {/* AI Justification (Decomposition findings) */}
            <div className="justification-section">
              <h3>AI Decision Justification</h3>
              <ul className="justification-list">
                {selectedLead.justification.map((factor, idx) => (
                  <li key={idx} className="justification-item">{factor}</li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="recommendation-section">
              <h3>Recommended RM Actions</h3>
              <ul className="recommendation-list">
                {selectedLead.recommendations.map((rec, idx) => (
                  <li key={idx} className="recommendation-item">{rec}</li>
                ))}
              </ul>
            </div>

            {/* Message composer */}
            <div className="message-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <h3>Personalized Outreach Draft</h3>
                <div className="db-tabs" style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>
                  <button
                    id="channel-tab-whatsapp"
                    className={`db-tab-btn ${outreachChannel === "WhatsApp" ? "active" : ""}`}
                    style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                    onClick={() => setOutreachChannel("WhatsApp")}
                  >
                    WhatsApp
                  </button>
                  <button
                    id="channel-tab-email"
                    className={`db-tab-btn ${outreachChannel === "Email" ? "active" : ""}`}
                    style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                    onClick={() => setOutreachChannel("Email")}
                  >
                    Email
                  </button>
                </div>
              </div>
              <div className="message-composer">
                <textarea
                  id="outreach-message-textarea"
                  className="message-textarea"
                  style={{ minHeight: outreachChannel === "Email" ? "180px" : "110px" }}
                  value={editableMsg}
                  onChange={(e) => setEditableMsg(e.target.value)}
                />
                
                <div className="message-actions">
                  <button id="send-whatsapp-campaign-btn" className="btn btn-primary" onClick={handleDispatch}>
                    {outreachChannel === "WhatsApp" ? <Send size={14} /> : <Mail size={14} />}
                    <span>{outreachChannel === "WhatsApp" ? "Send via WhatsApp" : "Dispatch Email"}</span>
                  </button>
                  <button id="copy-text-campaign-btn" className="btn btn-secondary" onClick={handleCopy}>
                    <Clipboard size={14} />
                    <span>{copied ? "Copied!" : "Copy Text"}</span>
                  </button>
                  {contactedStatus[selectedLeadId] && (
                    <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--color-success)", fontSize: "0.85rem", fontWeight: 600 }}>
                      <CheckCircle size={16} /> Mark: Outreach Sent
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-placeholder">
            <HelpCircle className="empty-placeholder-icon" />
            <h3>Select a lead</h3>
            <p style={{ fontSize: "0.8rem" }}>Choose a customer lead from the sidebar to inspect details.</p>
          </div>
        )}
      </div>

      {/* MOCK DISPATCH PREVIEW MODAL */}
      {showDispatchModal && selectedLead && customerProfile && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          display: "flex",
          alignItems: "center",
          justify: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}>
          <div className="glass-card" style={{
            width: "480px",
            margin: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            background: "var(--bg-secondary)",
            border: "1px solid var(--color-primary-glow)",
            boxShadow: "0 0 30px rgba(0, 240, 255, 0.1)"
          }}>
            {isDispatching ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", gap: "1.25rem", textAlign: "center" }}>
                <RefreshCw className="loader" style={{ width: 48, height: 48, borderWidth: 4, color: "var(--color-success)" }} />
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>
                  {outreachChannel === "WhatsApp" ? "Dispatching Communication" : "SMTP Email Transmission"}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%", maxWidth: "320px", background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-color)", textAlign: "left" }}>
                  <div style={{ fontSize: "0.8rem", color: dispatchStep >= 1 ? "var(--text-primary)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: dispatchStep >= 1 ? "var(--color-success)" : "var(--text-muted)" }}>●</span>
                    <span>{outreachChannel === "WhatsApp" ? "Connecting to CRM Gateway..." : "Connecting to SMTP secure relay..."}</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: dispatchStep >= 2 ? "var(--text-primary)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: dispatchStep >= 2 ? "var(--color-success)" : "var(--text-muted)" }}>●</span>
                    <span>{outreachChannel === "WhatsApp" ? "Encrypting outreach copy..." : "Verifying recipient address DNS..."}</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: dispatchStep >= 3 ? "var(--text-primary)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: dispatchStep >= 3 ? "var(--color-success)" : "var(--text-muted)" }}>●</span>
                    <span>{outreachChannel === "WhatsApp" ? "Broadcasting via Twilio API..." : "Sending email MIME payload..."}</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: dispatchStep >= 4 ? "var(--color-success)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: dispatchStep >= 4 ? "bold" : "normal" }}>
                    <span style={{ color: dispatchStep >= 4 ? "var(--color-success)" : "var(--text-muted)" }}>✔</span>
                    <span>{outreachChannel === "WhatsApp" ? "Outreach sent successfully!" : "Email transmitted successfully!"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem" }}>
                    {outreachChannel === "WhatsApp" ? "WhatsApp Dispatch Confirmation" : "SMTP Email Dispatch Confirmation"}
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-primary)", background: "rgba(0,240,255,0.08)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                    API Simulator
                  </span>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    <strong>Recipient:</strong> {customerProfile.name} ({outreachChannel === "WhatsApp" ? customerProfile.phone : customerProfile.email})
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    <strong>Product:</strong> {selectedLead.productType}
                  </div>
                </div>

                <div style={{
                  background: outreachChannel === "WhatsApp" ? "#075e54" : "rgba(255,255,255,0.04)",
                  padding: "1rem",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "0.85rem",
                  lineHeight: "1.4",
                  border: outreachChannel === "WhatsApp" ? "1px solid #128c7e" : "1px solid var(--border-color)",
                  position: "relative",
                  maxHeight: "180px",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap"
                }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: outreachChannel === "WhatsApp" ? "#ece5dd" : "var(--text-secondary)", marginBottom: "0.25rem" }}>
                    {outreachChannel === "WhatsApp" ? "RM Chat Dispatch:" : "Email MIME Preview:"}
                  </div>
                  {editableMsg}
                </div>

                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                  Confirming this dispatch will trigger the mock banking communications system to send this payload.
                </p>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                  <button id="dispatch-cancel-btn" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }} onClick={() => setShowDispatchModal(false)}>
                    Cancel
                  </button>
                  <button id="dispatch-confirm-btn" className="btn btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.8rem" }} onClick={confirmDispatch}>
                    Confirm & Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
