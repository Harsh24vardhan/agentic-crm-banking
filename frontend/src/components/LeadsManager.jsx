import { API_BASE_URL } from "../config.js";
import React, { useState, useEffect } from "react";
import { mockCustomers } from "../../../shared/mockDatabase.js";
import { MessageSquare, Send, Clipboard, CheckCircle, HelpCircle, Mail, RefreshCw, ExternalLink } from "lucide-react";
import { generate_personalized_message } from "../agent/tools";
import { useToast } from "../context/ToastContext.jsx";
import { getPreferences } from "../utils/preferences.js";

export default function LeadsManager({ leads, activeProduct, setActiveTab, setInitialQuery, currentUser }) {
  const { showSuccess, showError } = useToast();
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [editableMsg, setEditableMsg] = useState("");
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contactedStatus, setContactedStatus] = useState({}); // customerId -> boolean
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStep, setDispatchStep] = useState(0);
  // Defaults to the RM's saved Preferences & Settings channel, not a
  // hardcoded value — see UserProfile.jsx.
  const [outreachChannel, setOutreachChannel] = useState(() => getPreferences(currentUser?.id).defaultChannel);

  // Set default selected lead when leads update
  useEffect(() => {
    if (leads && leads.length > 0) {
      setSelectedLeadId(leads[0].customerId);
      setOutreachChannel(getPreferences(currentUser?.id).defaultChannel);
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
    showSuccess("Message copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatch = () => {
    setShowDispatchModal(true);
  };

  const getWhatsAppLink = (phone, message) => {
    const digits = (phone || "").replace(/[^0-9]/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  };

  const openInWhatsApp = () => {
    if (!customerProfile?.phone) {
      showError("This customer has no phone number on file.");
      return;
    }
    window.open(getWhatsAppLink(customerProfile.phone, editableMsg), "_blank", "noopener,noreferrer");
    showSuccess(`Opened WhatsApp for ${customerProfile.name}.`);
  };

  const openInEmailClient = () => {
    if (!customerProfile?.email) {
      showError("This customer has no email address on file.");
      return;
    }
    const subject = encodeURIComponent(`${selectedLead?.productType || "Offer"} - Personalized Update`);
    window.location.href = `mailto:${customerProfile.email}?subject=${subject}&body=${encodeURIComponent(editableMsg)}`;
    showSuccess(`Opened email client for ${customerProfile.name}.`);
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
      showSuccess(
        outreachChannel === "WhatsApp"
          ? `WhatsApp outreach sent to ${customerProfile?.name || "customer"}.`
          : `Email dispatched to ${customerProfile?.name || "customer"}.`
      );
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
    showSuccess(`Exported ${leads.length} lead${leads.length === 1 ? "" : "s"} to CSV.`);
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

      {/* DISPATCH PREVIEW MODAL */}
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
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}>
          <div className="glass-card" style={{
            width: "480px",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            background: "var(--bg-secondary)",
            border: "1px solid var(--color-primary-glow)",
            boxShadow: "0 0 40px rgba(0, 240, 255, 0.12)"
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.9rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: outreachChannel === "WhatsApp" ? "rgba(37, 211, 102, 0.12)" : "var(--color-primary-glow)",
                      color: outreachChannel === "WhatsApp" ? "#25d366" : "var(--color-primary)"
                    }}>
                      {outreachChannel === "WhatsApp" ? <Send size={17} /> : <Mail size={17} />}
                    </div>
                    <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem" }}>
                      {outreachChannel === "WhatsApp" ? "WhatsApp Dispatch" : "Email Dispatch"}
                    </h3>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)", padding: "0.2rem 0.55rem", borderRadius: "20px" }}>
                    CRM Simulator
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Recipient:</strong> {customerProfile.name} · {outreachChannel === "WhatsApp" ? customerProfile.phone : customerProfile.email}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Product:</strong> {selectedLead.productType}
                  </div>
                </div>

                <div style={{
                  background: outreachChannel === "WhatsApp" ? "#0b141a" : "rgba(255,255,255,0.03)",
                  padding: "1rem",
                  borderRadius: "12px",
                  fontSize: "0.85rem",
                  lineHeight: "1.5",
                  border: outreachChannel === "WhatsApp" ? "1px solid rgba(37, 211, 102, 0.2)" : "1px solid var(--border-color)"
                }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: "bold", letterSpacing: "0.03em", textTransform: "uppercase", color: outreachChannel === "WhatsApp" ? "#25d366" : "var(--text-secondary)", marginBottom: "0.6rem" }}>
                    {outreachChannel === "WhatsApp" ? "Message Preview" : "Email Body Preview"}
                  </div>
                  <div style={{
                    background: outreachChannel === "WhatsApp" ? "#005c4b" : "transparent",
                    color: outreachChannel === "WhatsApp" ? "#e9edef" : "var(--text-primary)",
                    padding: outreachChannel === "WhatsApp" ? "0.65rem 0.85rem" : 0,
                    borderRadius: outreachChannel === "WhatsApp" ? "10px 10px 2px 10px" : 0,
                    maxHeight: "160px",
                    overflowY: "auto",
                    whiteSpace: "pre-wrap"
                  }}>
                    {editableMsg}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.65rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button id="dispatch-cancel-btn" className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }} onClick={() => setShowDispatchModal(false)}>
                    Cancel
                  </button>
                  <button
                    id="dispatch-open-external-btn"
                    className="btn btn-secondary"
                    style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
                    onClick={outreachChannel === "WhatsApp" ? openInWhatsApp : openInEmailClient}
                  >
                    <ExternalLink size={13} />
                    <span>{outreachChannel === "WhatsApp" ? "Open in WhatsApp" : "Open in Email App"}</span>
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
