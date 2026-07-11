import { API_BASE_URL } from "../config.js";
import React, { useState } from "react";
import { Brain, Lock, User, AlertCircle, Check } from "lucide-react";
import { mockUsers } from "../agent/mockDatabase.js";

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password })
      });
      
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          localStorage.setItem("observe_user", JSON.stringify(result.data));
          onLoginSuccess(result.data);
          return;
        } else {
          setError(result.error || "Authentication failed.");
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Express backend auth offline. Falling back to local verification.");
    }

    // Local Fallback
    const user = mockUsers.find(u => u.username === username.trim() && u.password === password);
    if (user) {
      const userData = {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        region: user.region,
        email: user.email,
        phone: user.phone,
        portfolioSize: user.portfolioSize,
        conversionRate: user.conversionRate
      };
      localStorage.setItem("observe_user", JSON.stringify(userData));
      onLoginSuccess(userData);
    } else {
      setError("Invalid username or password (offline mode).");
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="glass-card modal-content" style={{ width: "420px", padding: "2rem", border: "1px solid var(--border-color-active)" }}>
        
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", marginBottom: "1.75rem", textAlign: "center" }}>
          <div style={{
            width: "54px",
            height: "54px",
            borderRadius: "14px",
            background: "rgba(0, 240, 255, 0.08)",
            border: "1px solid var(--border-color-active)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-glow)",
            color: "var(--color-primary)"
          }}>
            <Brain size={28} className="brand-icon" />
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.45rem", fontWeight: "800", background: "linear-gradient(135deg, #fff, var(--color-primary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Agentic AI System Portal
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
            Access your relationship management and campaign console
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid var(--color-danger)",
            borderRadius: "8px",
            padding: "0.6rem 0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--color-danger)",
            fontSize: "0.8rem",
            marginBottom: "1rem"
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <User size={12} />
              <span>Username / Login ID</span>
            </label>
            <input
              type="text"
              className="form-control"
              required
              placeholder="e.g. admin or sarah"
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <Lock size={12} />
              <span>Security Password</span>
            </label>
            <input
              type="password"
              className="form-control"
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary"
            style={{
              width: "100%",
              marginTop: "0.5rem",
              background: "linear-gradient(135deg, var(--color-primary) 0%, #3b82f6 100%)",
              color: "#000",
              fontWeight: 700
            }}
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Authenticate Access"}
          </button>
        </form>

        {/* Helper Credentials */}
        <div style={{
          marginTop: "1.5rem",
          paddingTop: "1rem",
          borderTop: "1px solid var(--border-color)",
          fontSize: "0.75rem",
          color: "var(--text-muted)"
        }}>
          <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.35rem" }}>Demo Logins:</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span>Admin Console: <strong>admin</strong> / password123</span>
          </div>
          <div>
            <span>Sarah Connor (RM): <strong>sarah</strong> / password123</span>
          </div>
        </div>

      </div>
    </div>
  );
}
