import React, { useState, useCallback, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import DashboardMetrics from "./components/DashboardMetrics";
import AgentConsole from "./components/AgentConsole";
import DatabaseViewer from "./components/DatabaseViewer";
import LeadsManager from "./components/LeadsManager";
import HomePage from "./components/HomePage";
import UserProfile from "./components/UserProfile";
import Login from "./components/Login";
import RmManager from "./components/RmManager";
import { useToast } from "./context/ToastContext.jsx";

export default function App() {
  const { showSuccess } = useToast();

  // Session State
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("observe_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const isAdmin = currentUser?.role === "admin";

  const getTabFromPath = () => {
    const path = window.location.pathname.replace(/^\//, "");
    if (isAdmin) {
      if (["rms", "database"].includes(path)) return path;
      return "rms";
    } else {
      if (["home", "dashboard", "agent", "database", "leads", "profile"].includes(path)) return path;
      return "home";
    }
  };

  const [activeTab, setActiveTabState] = useState(getTabFromPath);
  const [leads, setLeads] = useState([]);
  const [activeProduct, setActiveProduct] = useState("");
  const [initialQuery, setInitialQuery] = useState("");

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light-theme");
    } else {
      root.classList.remove("light-theme");
    }
  }, [theme]);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    const newPath = `/${tab}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, "", newPath);
    }
  };

  // Reset tab when user logging state or role changes
  useEffect(() => {
    setActiveTabState(getTabFromPath());
  }, [currentUser]);

  useEffect(() => {
    const handlePopState = () => {
      setActiveTabState(getTabFromPath());
    };
    window.addEventListener("popstate", handlePopState);
    
    // Redirect root "/" based on role
    const currentPath = window.location.pathname;
    if (currentPath === "/" || currentPath === "") {
      const defaultDest = isAdmin ? "/rms" : "/home";
      window.history.replaceState(null, "", defaultDest);
    }
    
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentUser, isAdmin]);

  const handleLogout = () => {
    localStorage.removeItem("observe_user");
    setCurrentUser(null);
    showSuccess("You've been logged out securely.");
  };

  const handleLeadsGenerated = useCallback((generatedLeads, productType) => {
    setLeads(generatedLeads);
    setActiveProduct(productType);
  }, []);

  const renderContent = () => {
    if (isAdmin) {
      switch (activeTab) {
        case "rms":
          return <RmManager />;
        case "database":
          return (
            <DatabaseViewer
              setActiveTab={setActiveTab}
              setInitialQuery={setInitialQuery}
            />
          );
        default:
          return <RmManager />;
      }
    }

    switch (activeTab) {
      case "home":
        return (
          <HomePage
            setActiveTab={setActiveTab}
            setInitialQuery={setInitialQuery}
          />
        );
      case "dashboard":
        return (
          <DashboardMetrics
            setActiveTab={setActiveTab}
            setInitialQuery={setInitialQuery}
          />
        );
      case "database":
        return (
          <DatabaseViewer
            setActiveTab={setActiveTab}
            setInitialQuery={setInitialQuery}
          />
        );
      case "leads":
        return (
          <LeadsManager
            leads={leads}
            activeProduct={activeProduct}
            setActiveTab={setActiveTab}
            setInitialQuery={setInitialQuery}
            currentUser={currentUser}
          />
        );
      case "profile":
        return <UserProfile currentUser={currentUser} />;
      default:
        return (
          <HomePage
            setActiveTab={setActiveTab}
            setInitialQuery={setInitialQuery}
          />
        );
    }
  };

  // If not logged in, render the Login Screen overlay
  if (!currentUser) {
    return <Login onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main className="main-content">
        {/* AgentConsole stays mounted across tab switches (hidden via CSS,
            not unmounted) so a run in progress or its results survive
            navigating away and back — a plain switch-based render would
            destroy its local state on every tab change. */}
        {!isAdmin && (
          <div style={{ display: activeTab === "agent" ? "contents" : "none" }}>
            <AgentConsole
              onLeadsGenerated={handleLeadsGenerated}
              setTab={setActiveTab}
              initialQuery={initialQuery}
              setInitialQuery={setInitialQuery}
              currentUser={currentUser}
            />
          </div>
        )}
        {activeTab !== "agent" && renderContent()}
      </main>
    </div>
  );
}
