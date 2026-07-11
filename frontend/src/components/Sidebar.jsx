import React from "react";
import { Home, LayoutDashboard, Brain, Database, Users, LogOut, Settings, Sun, Moon } from "lucide-react";

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout, theme, toggleTheme }) {
  const isAdmin = currentUser?.role === "admin";

  const menuItems = isAdmin
    ? [
        { id: "rms", name: "RM Directory", icon: Users },
        { id: "database", name: "CRM Database", icon: Database }
      ]
    : [
        { id: "home", name: "Home Console", icon: Home },
        { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
        { id: "agent", name: "Agent Console", icon: Brain },
        { id: "database", name: "CRM Database", icon: Database },
        { id: "leads", name: "Campaign Leads", icon: Users }
      ];

  const handleBrandClick = () => {
    if (isAdmin) setActiveTab("rms");
    else setActiveTab("home");
  };

  const getInitials = (name) => {
    if (!name) return "US";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  return (
    <div className="sidebar">
      <div className="brand" style={{ cursor: "pointer" }} onClick={handleBrandClick}>
        <Brain className="brand-icon" />
        <span className="brand-name">Agentic AI System</span>
      </div>

      <ul className="nav-list">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.id}
              id={`nav-tab-${item.id}`}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon className="nav-icon" />
              <span>{item.name}</span>
            </li>
          );
        })}
      </ul>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
        <button 
          id="theme-toggle-btn"
          className="btn btn-secondary" 
          style={{ 
            padding: "0.35rem 0.5rem", 
            fontSize: "0.75rem", 
            display: "flex", 
            alignItems: "center", 
            gap: "0.35rem", 
            justifyContent: "center", 
            width: "100%", 
            cursor: "pointer",
            marginBottom: "0.25rem"
          }}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun size={12} style={{ color: "var(--color-warning)" }} /> : <Moon size={12} style={{ color: "var(--color-purple)" }} />}
          <span>{theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
        </button>

        <div 
          id="sidebar-user-profile"
          className={`user-profile ${activeTab === "profile" ? "active-profile" : ""}`}
          style={{ 
            cursor: isAdmin ? "default" : "pointer", 
            borderRadius: "10px", 
            padding: "0.5rem",
            borderTop: "none",
            paddingTop: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}
          onClick={() => !isAdmin && setActiveTab("profile")}
        >
          <div className="avatar">{getInitials(currentUser?.name)}</div>
          <div className="user-info">
            <span className="user-name" style={{ color: activeTab === "profile" ? "var(--color-primary)" : "var(--text-primary)", fontSize: "0.85rem" }}>
              {currentUser?.name || "User"}
            </span>
            <span className="user-role" style={{ fontSize: "0.7rem" }}>
              {isAdmin ? "System Administrator" : "Relationship Manager"}
            </span>
          </div>
        </div>

        <button 
          id="logout-btn"
          className="btn btn-secondary" 
          style={{ padding: "0.35rem 0.5rem", fontSize: "0.75rem", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--color-danger)", background: "rgba(239, 68, 68, 0.02)", display: "flex", alignItems: "center", gap: "0.35rem", justifyContent: "center", width: "100%", cursor: "pointer" }}
          onClick={onLogout}
        >
          <LogOut size={12} />
          <span>Log Out Session</span>
        </button>
      </div>
    </div>
  );
}
