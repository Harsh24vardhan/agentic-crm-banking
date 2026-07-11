import { API_BASE_URL } from "../config.js";
import React, { useState, useEffect } from "react";
import { Brain, Database, Users, LayoutDashboard, Terminal, ArrowRight, ShieldCheck, Cpu, Zap } from "lucide-react";

export default function HomePage({ setActiveTab, setInitialQuery }) {
  const [status, setStatus] = useState({ online: false, database: "Checking..." });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (res.ok) {
          const data = await res.json();
          setStatus({ online: true, database: data.database || "Connected" });
        } else {
          throw new Error("Offline");
        }
      } catch (err) {
        setStatus({ online: false, database: "Offline" });
      }
    };
    checkStatus();
  }, []);
  const systemFeatures = [
    {
      title: "Agentic AI Agent Orchestrator",
      description: "Perform stateful ReAct logic queries to scan prospects using natural language.",
      tab: "agent",
      icon: Brain,
      color: "var(--color-primary)"
    },
    {
      title: "CRM Database Browser",
      description: "Direct view of core customer information, risk profiles, and ledger logs.",
      tab: "database",
      icon: Database,
      color: "var(--color-success)"
    },
    {
      title: "Campaign Leads Manager",
      description: "Inspect scored leads, customize email/WhatsApp outreach copies, and simulate API dispatches.",
      tab: "leads",
      icon: Users,
      color: "var(--color-purple)"
    },
    {
      title: "Analytics Dashboard",
      description: "Dynamic segment distribution donut charts and real-time transaction activity summaries.",
      tab: "dashboard",
      icon: LayoutDashboard,
      color: "var(--color-warning)"
    }
  ];

  const quickScans = [
    {
      label: "Scan for Travel Card upgrades",
      query: "Identify frequent flyer profiles for premium Travel Elite Card upgrades with credit scores above 700"
    },
    {
      label: "Scan for Personal Loan renewals",
      query: "Find high-value customers likely to convert for a personal loan this month and generate personalized WhatsApp messages"
    },
    {
      label: "Scan HNW Wealth Advisory",
      query: "Find high net-worth individuals with balances over $100k for wealth advisory campaigns and generate outreach"
    }
  ];

  return (
    <div style={{ overflowY: "auto", flex: 1, paddingBottom: "2rem" }}>
      {/* Welcome Banner */}
      <div className="glass-card" style={{ 
        padding: "2rem", 
        marginBottom: "1.5rem", 
        background: "var(--bg-banner)",
        borderColor: "var(--border-banner)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "absolute", right: "-30px", bottom: "-30px", opacity: 0.1 }}>
          <Brain size={240} style={{ color: "var(--color-primary)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <span style={{ 
            fontSize: "0.8rem", 
            fontWeight: 700, 
            letterSpacing: "1.5px", 
            textTransform: "uppercase", 
            color: "var(--color-primary)",
            background: "var(--color-primary-glow)",
            padding: "0.25rem 0.5rem",
            borderRadius: "4px"
          }}>
            Relationship Manager Platform
          </span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: "800", marginTop: "0.75rem", marginBottom: "0.5rem" }}>
            Welcome to Agentic AI System Console
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "600px", lineHeight: "1.6" }}>
            An agentic CRM workflow designed to automate customer analysis, conversion probability heuristics scoring, and personalized channel copy drafts.
          </p>
        </div>
      </div>

      {/* Feature Grid */}
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem" }}>
        CRM Capabilities & Workflows
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {systemFeatures.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div 
              key={idx} 
              className="glass-card" 
              style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "180px", cursor: "pointer", transition: "transform 0.2s ease" }}
              onClick={() => setActiveTab(feat.tab)}
            >
              <div>
                <div style={{ 
                  width: "36px", 
                  height: "36px", 
                  borderRadius: "8px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  background: `${feat.color}15`, 
                  color: feat.color,
                  border: `1px solid ${feat.color}30`,
                  marginBottom: "0.75rem"
                }}>
                  <Icon size={18} />
                </div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.35rem" }}>{feat.title}</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>{feat.description}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: feat.color, fontWeight: 600, marginTop: "0.5rem" }}>
                <span>Launch view</span>
                <ArrowRight size={12} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Launch & Status */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        {/* Quick Launch Searches */}
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", fontFamily: "var(--font-display)" }}>
            Quick-Start Campaign Scans
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {quickScans.map((qs, idx) => (
              <div 
                key={idx}
                className="preset-btn"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1rem", border: "1px solid var(--border-color)", borderRadius: "10px", cursor: "pointer" }}
                onClick={() => {
                  setInitialQuery(qs.query);
                  setActiveTab("agent");
                }}
              >
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{qs.label}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem", fontFamily: "monospace" }}>{qs.query.substring(0, 75)}...</div>
                </div>
                <Zap size={14} style={{ color: "var(--color-primary)" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Platform Status */}
        <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem", fontFamily: "var(--font-display)" }}>
              Platform Services Status
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justify: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>API Gateway</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: status.online ? "var(--color-success)" : "var(--color-danger)", fontWeight: 600 }}>
                  <ShieldCheck size={14} /> {status.online ? "Active" : "Offline"}
                </span>
              </div>
              <div style={{ display: "flex", justify: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Database Engine</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: status.online ? (status.database === "PostgreSQL" ? "var(--color-success)" : "var(--color-warning)") : "var(--color-danger)", fontWeight: 600 }}>
                  <ShieldCheck size={14} /> {status.database}
                </span>
              </div>
              <div style={{ display: "flex", justify: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>CRM Tool Registry</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--color-success)", fontWeight: 600 }}>
                  <Cpu size={14} /> 4 Tools Loaded
                </span>
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
            Agentic AI System Core Client v1.2.0
          </div>
        </div>
      </div>
    </div>
  );
}
