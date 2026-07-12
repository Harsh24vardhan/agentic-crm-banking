import { API_BASE_URL } from "../config.js";
import React, { useState, useEffect } from "react";
import { Send, RefreshCw, Terminal, Search, UserCheck, BrainCircuit, Wrench, Eye, Zap, ListChecks, WifiOff, MessageSquare, RotateCcw } from "lucide-react";
import { runAgent } from "../agent/agentCore";
import { useToast } from "../context/ToastContext.jsx";

const MAX_HISTORY_TURNS = 12;

// A compact, human-readable recap of one turn — not a tool-call transcript.
// This is what gets sent back to the LLM tier as conversation history on the
// *next* turn, so it stays cheap in tokens (see llmAgentCore.js). Only the
// LLM tier reads history; the deterministic/offline tiers are single-turn
// by design (see README trade-offs).
function buildTurnSummary(userQuery, result) {
  if (!result || !result.success) {
    return `Query: "${userQuery}" -> failed (${result?.error || "unknown error"}).`;
  }
  if (!result.leads || result.leads.length === 0) {
    return `Query: "${userQuery}" -> no qualifying candidates found for ${result.productType}.`;
  }
  const leadList = result.leads.map((l) => `${l.customerName} (${l.customerId}, ${l.conversionScore}%)`).join(", ");
  return `Query: "${userQuery}" -> found and scored ${result.leads.length} candidate(s) for ${result.productType}: ${leadList}.`;
}

export default function AgentConsole({ onLeadsGenerated, setTab, initialQuery, setInitialQuery }) {
  const { showSuccess, showError } = useToast();
  const [query, setQuery] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1500); // ms per step
  const [agentOutput, setAgentOutput] = useState(null);
  const [visibleSteps, setVisibleSteps] = useState([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  const presets = [
    {
      label: "Use Case 1: Personal Loan Campaign",
      query: "Find high-value customers likely to convert for a personal loan this month and generate personalized WhatsApp messages."
    },
    {
      label: "Use Case 2: Premium Travel Card Upgrades",
      query: "Identify frequent flyer profiles for premium Travel Elite Card upgrades with credit scores above 700."
    },
    {
      label: "Use Case 3: High Balance Wealth Management",
      query: "Find high net-worth individuals with balances over ₹100k for wealth advisory campaigns and generate outreach."
    }
  ];

  // Auto-trigger search when initialQuery is provided from another view.
  // Arriving from elsewhere in the app is a new topic, not a follow-up, so
  // it starts a fresh conversation.
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleStart(initialQuery, true);
      setInitialQuery("");
    }
  }, [initialQuery, setInitialQuery]);

  const handleNewConversation = () => {
    setConversationHistory([]);
    setQuery("");
    setAgentOutput(null);
    setVisibleSteps([]);
    setCurrentStepIdx(-1);
    setSelectedLeadId(null);
  };

  const handleStart = async (selectedQuery, resetConversation = false) => {
    const q = selectedQuery || query;
    if (!q.trim()) return;

    if (selectedQuery) {
      setQuery(selectedQuery);
    }

    // Pass the history explicitly rather than reading it back from state
    // right after clearing it — setState is async, so a same-tick read
    // could still see the pre-reset value.
    const historyForThisTurn = resetConversation ? [] : conversationHistory;
    if (resetConversation) {
      setConversationHistory([]);
    }

    setIsRunning(true);
    setVisibleSteps([]);
    setCurrentStepIdx(-1);
    setAgentOutput(null);
    setSelectedLeadId(null);

    let result;
    try {
      // Attempt backend API call. `history` only matters to the LLM tier —
      // the deterministic engine ignores it (single-turn by design).
      const response = await fetch(`${API_BASE_URL}/api/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, history: historyForThisTurn })
      });
      if (response.ok) {
        result = await response.json();
      }
    } catch (err) {
      console.warn("Express backend API offline. Falling back to local client-side ReAct core.", err);
    }

    // Client-side fallback run (backend unreachable or returned non-OK)
    if (!result) {
      result = runAgent(q);
    }

    setAgentOutput(result);
    if (result.success && result.leads.length > 0) {
      onLeadsGenerated(result.leads, result.productType);
      setSelectedLeadId(result.leads[0].customerId);
    }
    setConversationHistory([
      ...historyForThisTurn,
      { role: "user", content: q },
      { role: "assistant", content: buildTurnSummary(q, result) }
    ].slice(-MAX_HISTORY_TURNS));

    // Start step-by-step visualization
    setCurrentStepIdx(0);
  };

  // Step-by-step playback effect
  useEffect(() => {
    if (currentStepIdx === -1 || !agentOutput) return;

    if (currentStepIdx < agentOutput.steps.length) {
      const timer = setTimeout(() => {
        setVisibleSteps((prev) => [...prev, agentOutput.steps[currentStepIdx]]);
        setCurrentStepIdx((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      setIsRunning(false);
      // Callback to pass the generated leads up to App level
      if (agentOutput.success && agentOutput.leads.length > 0) {
        onLeadsGenerated(agentOutput.leads, agentOutput.productType);
        setSelectedLeadId(agentOutput.leads[0].customerId);
        showSuccess(`Scan complete: ${agentOutput.leads.length} lead${agentOutput.leads.length === 1 ? "" : "s"} identified.`);
      } else if (agentOutput.success) {
        showError("Scan complete, but no matching prospects were found.");
      } else {
        showError(agentOutput.error || "Agent scan failed to complete.");
      }
    }
  }, [currentStepIdx, agentOutput, speed]);

  const getSpeedLabel = () => {
    if (speed === 3000) return "Slow (3s)";
    if (speed === 1500) return "Normal (1.5s)";
    return "Fast (0.5s)";
  };

  const toggleSpeed = () => {
    if (speed === 3000) setSpeed(1500);
    else if (speed === 1500) setSpeed(500);
    else setSpeed(3000);
  };

  const getScoreClass = (score) => {
    if (score >= 75) return "score-high";
    if (score >= 45) return "score-medium";
    return "score-low";
  };

  const ENGINE_CONFIG = {
    llm: { icon: Zap, label: "LLM-driven (Groq)", className: "engine-badge-llm", title: "A real LLM dynamically planned this tool-use loop — it chose which tools to call, in what order, based on live results." },
    heuristic: { icon: ListChecks, label: "Deterministic Engine", className: "engine-badge-heuristic", title: "Server-side fixed pipeline (LLM unavailable or no API key configured). Same tools, scripted order — a designed fallback, not a bug." },
    offline: { icon: WifiOff, label: "Offline Fallback", className: "engine-badge-offline", title: "Backend unreachable — the ReAct pipeline ran entirely in-browser against local mock data." }
  };

  const EngineBadge = () => {
    const config = ENGINE_CONFIG[agentOutput?.engine];
    if (!config) return null;
    const Icon = config.icon;
    return (
      <span className={`engine-badge ${config.className}`} title={config.title}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  return (
    <div className="agent-console-layout">
      {/* Left panel: Query entry & ReAct execution trace */}
      <div className="agent-workspace">
        <div className="glass-card agent-input-panel">
          <div className="card-header" style={{ border: "none", marginBottom: "0.5rem" }}>
            <h2>Agentic AI Agent Orchestrator</h2>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Terminal size={16} style={{ color: "var(--color-primary)" }} />
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>ReAct Loop Mode</span>
            </div>
          </div>

          <div className="agent-input-container">
            <input
              type="text"
              id="agent-query-input"
              className="agent-input"
              placeholder={
                conversationHistory.length > 0
                  ? "Ask a follow-up... (e.g. now do the same for wealth advisory)"
                  : "Ask the Agent... (e.g. Find personal loan candidates with credit score > 700)"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              disabled={isRunning}
            />
            <button
              id="run-agent-btn"
              className="agent-submit-btn"
              onClick={() => handleStart()}
              disabled={isRunning || !query.trim()}
            >
              {isRunning ? <RefreshCw className="loader" size={16} /> : <Send size={16} />}
              <span>{isRunning ? "Running..." : "Run Agent"}</span>
            </button>
          </div>

          {conversationHistory.length > 0 && (
            <div className="conversation-thread-bar">
              <div className="conversation-thread-pills">
                <MessageSquare size={13} style={{ flexShrink: 0, color: "var(--color-primary)" }} />
                {conversationHistory.filter((t) => t.role === "user").map((turn, idx) => (
                  <span key={idx} className="conversation-pill" title={turn.content}>
                    {turn.content.length > 44 ? `${turn.content.slice(0, 44)}…` : turn.content}
                  </span>
                ))}
              </div>
              <button
                id="new-conversation-btn"
                className="conversation-reset-btn"
                onClick={handleNewConversation}
                disabled={isRunning}
                title="Clear conversation memory and start a new topic"
              >
                <RotateCcw size={13} />
                <span>New Conversation</span>
              </button>
            </div>
          )}

          {!isRunning && visibleSteps.length === 0 && (
            <div className="preset-queries">
              <span className="preset-label">Recommended Queries:</span>
              <div className="preset-list">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    id={`preset-btn-${idx}`}
                    className="preset-btn"
                    onClick={() => handleStart(preset.query, true)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Execution Trace */}
        {(visibleSteps.length > 0 || isRunning) && (
          <div className="glass-card execution-trace-panel">
            <div className="trace-controls">
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>Agent Execution Logs</span>
                {isRunning && <span className="loader" style={{ width: 14, height: 14, borderWidth: 2 }}></span>}
                <EngineBadge />
              </h3>
              <button id="trace-speed-btn" className="trace-speed-btn" onClick={toggleSpeed}>
                Speed: {getSpeedLabel()}
              </button>
            </div>

            <div className="trace-flow">
              {visibleSteps.map((step, idx) => {
                const isActive = idx === visibleSteps.length - 1 && isRunning;
                const isCompleted = !isActive;
                return (
                  <div 
                    key={idx} 
                    className={`step-card ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                  >
                    <div className="step-number">{step.stepNumber}</div>
                    <div className="step-thought" style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                      <BrainCircuit size={16} style={{ color: isActive ? "var(--color-primary)" : "var(--color-success)", flexShrink: 0, marginTop: "2px" }} />
                      <div>
                        <strong style={{ color: isActive ? "var(--color-primary)" : "var(--text-primary)" }}>Thought: </strong>
                        {step.thought}
                      </div>
                    </div>
                    {step.toolCall && (
                      <div className="step-action-box" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Wrench size={12} style={{ color: "var(--color-primary)" }} />
                        <span>Action: {step.toolCall}</span>
                      </div>
                    )}
                    {step.observation && (
                      <div className="step-observation-box" style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                        <Eye size={14} style={{ color: "var(--color-success)", flexShrink: 0, marginTop: "2px" }} />
                        <div>
                          <strong>Observation: </strong>
                          {step.observation}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right panel: Leads overview generated by active search */}
      <div className="glass-card console-leads-panel">
        <div className="card-header">
          <h2>Agent Output Dashboard</h2>
        </div>

        {isRunning && visibleSteps.length < 4 ? (
          <div className="empty-placeholder">
            <RefreshCw className="loader" style={{ width: 48, height: 48, borderWidth: 4, marginBottom: "1rem" }} />
            <h3>Agent is executing tools...</h3>
            <p style={{ fontSize: "0.8rem" }}>Analyzing CRM and running eligibility models.</p>
          </div>
        ) : agentOutput && agentOutput.success && agentOutput.leads.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <div className="leads-list">
              {agentOutput.leads.map((lead) => (
                <div
                  key={lead.customerId}
                  id={`lead-card-${lead.customerId}`}
                  className={`lead-item-card ${selectedLeadId === lead.customerId ? "selected" : ""}`}
                  onClick={() => setSelectedLeadId(lead.customerId)}
                >
                  <div className="lead-header">
                    <span className="lead-name">{lead.customerName}</span>
                    <span className={`lead-score ${getScoreClass(lead.conversionScore)}`}>
                      {lead.conversionScore}% Score
                    </span>
                  </div>
                  <div className="lead-meta">
                    <span>Target: {lead.productType}</span>
                    <span>Likelihood: {lead.likelihood}</span>
                  </div>
                </div>
              ))}
            </div>

            {selectedLeadId && (
              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                <h4 style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                  Outreach Preview:
                </h4>
                <div style={{ 
                  background: "rgba(0, 0, 0, 0.2)", 
                  padding: "0.75rem", 
                  borderRadius: "8px", 
                  fontSize: "0.8rem", 
                  lineHeight: "1.4",
                  maxHeight: "80px",
                  overflowY: "auto",
                  color: "var(--text-secondary)",
                  marginBottom: "0.75rem"
                }}>
                  {agentOutput.leads.find(l => l.customerId === selectedLeadId)?.outreachMessage}
                </div>
                <button 
                  id="configure-campaign-btn"
                  className="btn btn-primary"
                  style={{ width: "100%", fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                  onClick={() => setTab("leads")}
                >
                  <UserCheck size={14} />
                  <span>Configure Leads in Campaign</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-placeholder">
            <Search className="empty-placeholder-icon" />
            <h3>No Active Campaign Leads</h3>
            <p style={{ fontSize: "0.8rem" }}>
              Submit a natural language search or select a preset usecase above to launch the AI discovery loop.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
