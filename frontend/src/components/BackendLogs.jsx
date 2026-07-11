import { API_BASE_URL } from "../config.js";
import React, { useState, useEffect } from "react";
import { Terminal, RefreshCw, Server, Database, Play, Pause, Activity } from "lucide-react";

export default function BackendLogs() {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState({ online: false, database: "Checking..." });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatusAndLogs = async () => {
    setLoading(true);
    try {
      // 1. Fetch health status
      const healthRes = await fetch(`${API_BASE_URL}/health`);
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setStatus({
          online: true,
          database: healthData.database || "PostgreSQL"
        });
      } else {
        throw new Error("Offline");
      }
    } catch (err) {
      setStatus({ online: false, database: "Connection Failed" });
    }

    try {
      // 2. Fetch server memory logs
      const logsRes = await fetch(`${API_BASE_URL}/api/logs`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (logsData.success) {
          setLogs(logsData.logs);
        }
      }
    } catch (err) {
      setLogs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatusAndLogs();
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchStatusAndLogs();
    }, 2000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const formatTimestamp = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString() + "." + String(date.getMilliseconds()).padStart(3, "0");
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)", gap: "1.5rem" }}>
      {/* Header Panel */}
      <div className="glass-card" style={{ padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Terminal size={18} style={{ color: "var(--color-primary)" }} />
            <span>Backend Server Control Console</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
            Monitor dynamic API gateway request logs and verify core database client connectivity status.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button 
            className="trace-speed-btn" 
            style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Pause size={12} /> : <Play size={12} />}
            <span>{autoRefresh ? "Pause Stream" : "Resume Stream"}</span>
          </button>
          <button 
            className="trace-speed-btn" 
            style={{ display: "flex", alignItems: "center", gap: "0.35rem", borderColor: "var(--color-primary-glow)" }}
            onClick={fetchStatusAndLogs}
            disabled={loading}
          >
            <RefreshCw size={12} className={loading ? "loader" : ""} />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {/* System Status Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
        {/* Status Panel 1: API Status */}
        <div className="glass-card" style={{ display: "flex", gap: "1rem", alignItems: "center", padding: "1rem 1.25rem" }}>
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: status.online ? "var(--color-success-glow)" : "var(--color-danger-glow)",
            color: status.online ? "var(--color-success)" : "var(--color-danger)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: status.online ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)"
          }}>
            <Server size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>API Gateway</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: status.online ? "var(--color-success)" : "var(--color-danger)", marginTop: "0.15rem" }}>
              {status.online ? "Online & Healthy" : "Offline / Unreachable"}
            </div>
          </div>
        </div>

        {/* Status Panel 2: DB Status */}
        <div className="glass-card" style={{ display: "flex", gap: "1rem", alignItems: "center", padding: "1rem 1.25rem" }}>
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: status.online ? "var(--color-primary-glow)" : "rgba(255,255,255,0.03)",
            color: status.online ? "var(--color-primary)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid var(--border-color)"
          }}>
            <Database size={18} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Active Database Connection</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.15rem" }}>
              {status.database}
            </div>
          </div>
        </div>

        {/* Status Panel 3: Active Stream */}
        <div className="glass-card" style={{ display: "flex", gap: "1rem", alignItems: "center", padding: "1rem 1.25rem" }}>
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: autoRefresh ? "var(--color-purple-glow)" : "rgba(255,255,255,0.03)",
            color: autoRefresh ? "var(--color-purple)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid var(--border-color)"
          }}>
            <Activity size={18} className={autoRefresh && status.online ? "loader" : ""} style={{ animationDuration: "2.5s" }} />
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Log Polling Stream</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.15rem" }}>
              {autoRefresh ? "Active (Every 2s)" : "Paused"}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal logs display */}
      <div className="glass-card" style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        background: "rgba(3, 7, 18, 0.95)", 
        borderColor: "rgba(0, 240, 255, 0.15)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.8)",
        borderRadius: "14px",
        overflow: "hidden",
        padding: "1rem"
      }}>
        {/* Terminal Title Bar */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "0.5rem", 
          paddingBottom: "0.75rem", 
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          marginBottom: "1rem"
        }}>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444" }}></div>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }}></div>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981" }}></div>
          </div>
          <div style={{ 
            fontSize: "0.75rem", 
            fontFamily: "monospace", 
            color: "rgba(255, 255, 255, 0.3)", 
            marginLeft: "0.5rem" 
          }}>
            agentic-ai-backend-log-stream
          </div>
        </div>

        {/* Console logs output */}
        <div style={{ 
          flex: 1, 
          overflowY: "auto", 
          fontFamily: "monospace", 
          fontSize: "0.8rem", 
          lineHeight: "1.6", 
          color: "rgba(255, 255, 255, 0.8)",
          paddingRight: "0.5rem"
        }}>
          {logs.length === 0 ? (
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              justifyContent: "center", 
              height: "100%", 
              color: "rgba(255, 255, 255, 0.25)" 
            }}>
              <div>// No incoming API requests recorded yet.</div>
              <div style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>Click other tabs to trigger actions and backend API requests.</div>
            </div>
          ) : (
            logs.map((log, idx) => {
              let methodColor = "var(--color-primary)";
              if (log.method === "POST") methodColor = "var(--color-purple)";
              else if (log.method === "PUT") methodColor = "var(--color-warning)";
              else if (log.method === "DELETE") methodColor = "var(--color-danger)";

              return (
                <div key={idx} style={{ 
                  display: "flex", 
                  gap: "1rem", 
                  padding: "0.15rem 0.5rem", 
                  borderRadius: "4px",
                  background: idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent"
                }}>
                  <span style={{ color: "rgba(255, 255, 255, 0.25)" }}>
                    [{formatTimestamp(log.timestamp)}]
                  </span>
                  <span style={{ color: methodColor, fontWeight: "bold" }}>
                    {log.method.padEnd(5, " ")}
                  </span>
                  <span style={{ color: "#ffffff", fontWeight: 500 }}>
                    {log.url}
                  </span>
                  <span style={{ color: "rgba(255, 255, 255, 0.25)", marginLeft: "auto" }}>
                    ip: {log.ip}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
