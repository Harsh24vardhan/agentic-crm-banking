import React, { useState } from "react";
import { Award, Mail, Phone, MapPin, Briefcase, Settings, TrendingUp } from "lucide-react";

export default function UserProfile({ currentUser }) {
  const roleLabel = currentUser?.role === "admin" ? "System Administrator" : "Relationship Manager";

  const [rmSettings, setRmSettings] = useState({
    defaultChannel: "WhatsApp",
    speed: "Normal",
    notifications: true,
    signature: `Best regards, ${currentUser?.name || "Relationship Manager"} - ${roleLabel}`
  });

  const getInitials = (name) => {
    if (!name) return "US";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const rmProfile = {
    name: currentUser?.name || "Unknown User",
    role: roleLabel,
    employeeId: currentUser?.id || "N/A",
    region: currentUser?.region || "Unassigned Region",
    email: currentUser?.email || "—",
    phone: currentUser?.phone || "—",
    portfolioSize: currentUser?.portfolioSize || "$0.00",
    conversionRate: currentUser?.conversionRate || "0.0%"
  };

  const targets = [
    { name: "Q3 Wealth Advisory Conversion", current: 3, target: 5, color: "var(--color-success)" },
    { name: "Q3 Personal Loan Campaign Yield", current: 8, target: 10, color: "var(--color-purple)" },
    { name: "Q3 Travel Elite Card Upgrades", current: 6, target: 8, color: "var(--color-primary)" }
  ];

  const handleSettingChange = (field, value) => {
    setRmSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ overflowY: "auto", flex: 1, paddingBottom: "2rem" }}>
      {/* Profile Overview Header */}
      <div className="glass-card" style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: "1.5rem", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ 
          width: "80px", 
          height: "80px", 
          borderRadius: "50%", 
          background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-purple) 100%)", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          fontSize: "2rem",
          fontWeight: "bold",
          color: "#fff",
          border: "3px solid rgba(255,255,255,0.1)"
        }}>
          {getInitials(rmProfile.name)}
        </div>
        
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: "700", marginBottom: "0.25rem" }}>{rmProfile.name}</h1>
          <p style={{ color: "var(--color-primary)", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Briefcase size={14} /> {rmProfile.role}
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <MapPin size={12} /> {rmProfile.region}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.8rem", color: "var(--text-secondary)", borderLeft: "1px solid var(--border-color)", paddingLeft: "1.5rem" }}>
          <div><strong>Employee ID:</strong> {rmProfile.employeeId}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}><Mail size={12} /> {rmProfile.email}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}><Phone size={12} /> {rmProfile.phone}</div>
        </div>
      </div>

      {/* Grid: Stats & Settings */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        
        {/* Left Column: Stats & Target Targets */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Portfolio Metrics */}
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <TrendingUp size={16} style={{ color: "var(--color-primary)" }} />
              <span>Relationship Portfolio</span>
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Portfolio Size</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--color-primary)" }}>{rmProfile.portfolioSize}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Conversion Rate</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--color-success)" }}>{rmProfile.conversionRate}</div>
              </div>
            </div>
          </div>

          {/* Performance Targets */}
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.25rem", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Award size={16} style={{ color: "var(--color-warning)" }} />
              <span>Q3 Conversion Targets</span>
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {targets.map((t, idx) => {
                const percent = Math.round((t.current / t.target) * 100);
                return (
                  <div key={idx}>
                    <div style={{ display: "flex", justify: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                      <span style={{ fontWeight: 500 }}>{t.name}</span>
                      <span>{t.current} / {t.target} ({percent}%)</span>
                    </div>
                    <div style={{ height: "6px", background: "rgba(255,255,255,0.04)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: `${percent}%`, height: "100%", background: t.color, boxShadow: `0 0 8px ${t.color}80` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Preferences Settings */}
        <div className="glass-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.25rem", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Settings size={16} style={{ color: "var(--color-purple)" }} />
            <span>Preferences & Settings</span>
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: "0.5rem" }}>
            Customize your AI console behavior and dispatch defaults.
          </p>

          <div className="form-group">
            <label>Default Communication Channel</label>
            <select 
              className="form-control" 
              value={rmSettings.defaultChannel} 
              onChange={e => handleSettingChange("defaultChannel", e.target.value)}
            >
              <option value="WhatsApp">WhatsApp Gateway Simulator</option>
              <option value="Email">SMTP Email Dispatcher</option>
            </select>
          </div>

          <div className="form-group">
            <label>AI Console Speed Mode</label>
            <select 
              className="form-control" 
              value={rmSettings.speed} 
              onChange={e => handleSettingChange("speed", e.target.value)}
            >
              <option value="Slow">Slow (3s delays)</option>
              <option value="Normal">Normal (1.5s delays)</option>
              <option value="Fast">Fast (0.5s delays)</option>
            </select>
          </div>

          <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "0.5rem 0" }}>
            <input 
              type="checkbox" 
              id="notifications-chk"
              checked={rmSettings.notifications} 
              onChange={e => handleSettingChange("notifications", e.target.checked)} 
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <label htmlFor="notifications-chk" style={{ display: "inline", margin: 0, fontSize: "0.85rem", cursor: "pointer" }}>
              Enable live sound & banner dispatch notifications
            </label>
          </div>

          <div className="form-group">
            <label>Outreach Email Signature</label>
            <textarea 
              className="form-control" 
              style={{ minHeight: "60px", resize: "none" }} 
              value={rmSettings.signature}
              onChange={e => handleSettingChange("signature", e.target.value)}
            />
          </div>

          <button 
            className="btn btn-primary"
            style={{ width: "100%", background: "linear-gradient(135deg, var(--color-primary) 0%, #3b82f6 100%)", color: "#000", marginTop: "0.5rem" }}
            onClick={() => alert("Settings saved successfully!")}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
