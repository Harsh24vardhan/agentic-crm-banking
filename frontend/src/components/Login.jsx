import { API_BASE_URL } from "../config.js";
import React, { useState } from "react";
import { Lock, User, AlertCircle, Eye, EyeOff, ShieldCheck, Zap } from "lucide-react";
import { mockUsers } from "../agent/mockDatabase.js";
import BrandLogo from "./BrandLogo";

const DEMO_LOGINS = [
  { label: "Admin Console", username: "admin", password: "password123", icon: ShieldCheck },
  { label: "Sarah Connor (RM)", username: "sarah", password: "password123", icon: Zap }
];

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    } catch {
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

  const fillDemoCredentials = (demo) => {
    setUsername(demo.username);
    setPassword(demo.password);
    setError("");
  };

  return (
    <div className="login-container">
      <div
        className="glass-card modal-content"
        style={{
          width: "420px",
          padding: "2.25rem",
          border: "1px solid var(--border-color-active)",
          animation: "fade-slide-up 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", marginBottom: "1.75rem", textAlign: "center" }}>
          <BrandLogo size={56} />
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
              autoFocus
              autoComplete="username"
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
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "0.6rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0.2rem"
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
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
          paddingTop: "1.25rem",
          borderTop: "1px solid var(--border-color)"
        }}>
          <div style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "0.6rem" }}>
            Quick Demo Access
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {DEMO_LOGINS.map((demo) => {
              const Icon = demo.icon;
              return (
                <button
                  key={demo.username}
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fillDemoCredentials(demo)}
                  disabled={loading}
                  style={{
                    justifyContent: "space-between",
                    padding: "0.55rem 0.8rem",
                    fontSize: "0.78rem",
                    fontWeight: 500
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Icon size={13} style={{ color: "var(--color-primary)" }} />
                    <span>{demo.label}</span>
                  </span>
                  <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: "0.72rem" }}>
                    {demo.username} / {demo.password}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
