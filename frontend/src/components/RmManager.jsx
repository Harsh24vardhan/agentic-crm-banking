import { API_BASE_URL } from "../config.js";
import React, { useState, useEffect } from "react";
import { UserPlus, MapPin, X, ShieldAlert, Trash2 } from "lucide-react";
import { mockUsers } from "../../../shared/mockDatabase.js";
import { validateRmInput } from "../../../shared/validators.js";
import { useToast } from "../context/ToastContext.jsx";

export default function RmManager() {
  const { showSuccess, showError } = useToast();
  const [rms, setRms] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    region: "",
    email: "",
    phone: "",
    portfolioSize: "₹0.00",
    conversionRate: "0.0%"
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const fetchRms = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/rms`);
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          setRms(result.data);
          return;
        }
      }
    } catch {
      console.warn("Express backend offline for RM listing. Using local state fallback.");
    }
    
    // Local Fallback
    const localRms = mockUsers.filter(u => u.role === "rm");
    setRms(localRms);
  };

  useEffect(() => {
    fetchRms();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const { valid, errors } = validateRmInput(form);
    if (!valid) {
      setFieldErrors(errors);
      setError(Object.values(errors)[0]);
      return;
    }

    const payload = {
      name: form.name.trim(),
      username: form.username.trim().toLowerCase(),
      password: form.password,
      region: form.region.trim() || "General Office",
      email: form.email.trim(),
      phone: form.phone.trim(),
      portfolioSize: form.portfolioSize || "₹0.00",
      conversionRate: form.conversionRate || "0.0%"
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/rms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showSuccess(`Successfully created Relationship Manager profile for ${payload.name}`);
        fetchRms();
        setShowAddModal(false);
        setForm({ name: "", username: "", password: "", region: "", email: "", phone: "", portfolioSize: "₹0.00", conversionRate: "0.0%" });
        return;
      } else {
        const msg = result.error || "Failed to create RM account.";
        setError(msg);
        if (result.errors) setFieldErrors(result.errors);
        showError(msg);
        return;
      }
    } catch {
      console.warn("Express backend offline for RM creation. Falling back to local update.");
    }

    // Local Fallback
    const exists = mockUsers.some(u => u.username === payload.username);
    if (exists) {
      const msg = "Username already exists (offline validation).";
      setError(msg);
      showError(msg);
      return;
    }

    const localNewRm = {
      ...payload,
      id: `USR${String(mockUsers.length + 1).padStart(3, "0")}`,
      role: "rm"
    };

    mockUsers.push(localNewRm);
    setRms(prev => [...prev, localNewRm]);
    showSuccess(`Offline Mode: Created Relationship Manager profile for ${payload.name}`);
    setShowAddModal(false);
    setForm({ name: "", username: "", password: "", region: "", email: "", phone: "", portfolioSize: "₹0.00", conversionRate: "0.0%" });
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setError("");
    setFieldErrors({});
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/rms/${deleteTarget.id}`, { method: "DELETE" });
      const result = await res.json();
      if (res.ok && result.success) {
        showSuccess(`Removed Relationship Manager profile for ${deleteTarget.name}.`);
        setRms(prev => prev.filter(rm => rm.id !== deleteTarget.id));
        setDeleteTarget(null);
        setIsDeleting(false);
        return;
      }
      showError(result.error || "Failed to delete Relationship Manager account.");
      setIsDeleting(false);
      return;
    } catch {
      console.warn("Express backend offline for RM deletion. Falling back to local update.");
    }

    // Local Fallback
    const index = mockUsers.findIndex(u => u.id === deleteTarget.id && u.role === "rm");
    if (index !== -1) mockUsers.splice(index, 1);
    setRms(prev => prev.filter(rm => rm.id !== deleteTarget.id));
    showSuccess(`Offline Mode: Removed Relationship Manager profile for ${deleteTarget.name}.`);
    setDeleteTarget(null);
    setIsDeleting(false);
  };

  return (
    <div style={{ overflowY: "auto", flex: 1, paddingBottom: "2rem" }}>
      {/* Header */}
      <div className="card-header" style={{ border: "none", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: "700" }}>System RM Directory</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Add, manage, and distribute CRM credentials for Relationship Managers (RMs).
          </p>
        </div>
        <button 
          id="admin-create-rm-btn"
          className="btn btn-primary"
          style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, #3b82f6 100%)", color: "#000", padding: "0.5rem 1rem", fontSize: "0.85rem", display: "flex", gap: "0.35rem" }}
          onClick={() => setShowAddModal(true)}
        >
          <UserPlus size={14} />
          <span>Create RM Profile</span>
        </button>
      </div>

      {/* Directory Table */}
      <div className="glass-card table-container" style={{ padding: 0 }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Full Name</th>
              <th>Login Username</th>
              <th>Email Address</th>
              <th>Phone Number</th>
              <th>Office Region</th>
              <th>Portfolio Value</th>
              <th>Conversion Rate</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rms.map((rm) => (
              <tr key={rm.id}>
                <td style={{ fontFamily: "monospace", color: "var(--color-primary)" }}>{rm.id}</td>
                <td style={{ fontWeight: 600 }}>{rm.name}</td>
                <td style={{ fontFamily: "monospace" }}>{rm.username}</td>
                <td>{rm.email}</td>
                <td>{rm.phone}</td>
                <td>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    <MapPin size={12} style={{ color: "var(--color-purple)" }} />
                    <span>{rm.region}</span>
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: "var(--color-primary)" }}>{rm.portfolioSize || "₹0.00"}</td>
                <td style={{ fontWeight: 600, color: "var(--color-success)" }}>{rm.conversionRate || "0.0%"}</td>
                <td>
                  <button
                    id={`delete-rm-btn-${rm.id}`}
                    onClick={() => setDeleteTarget(rm)}
                    title="Remove this Relationship Manager"
                    style={{
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      borderRadius: "8px",
                      color: "var(--color-danger)",
                      padding: "0.4rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE RM MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: "450px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>Create Relationship Manager</h3>
              <X size={16} style={{ cursor: "pointer", color: "var(--text-secondary)" }} onClick={closeAddModal} />
            </div>

            {error && (
              <div style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid var(--color-danger)",
                borderRadius: "8px",
                padding: "0.5rem 0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "var(--color-danger)",
                fontSize: "0.75rem",
                marginBottom: "1rem"
              }}>
                <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  placeholder="e.g. John Doe"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  style={fieldErrors.name ? { borderColor: "var(--color-danger)" } : undefined}
                />
                {fieldErrors.name && <span style={{ fontSize: "0.7rem", color: "var(--color-danger)" }}>{fieldErrors.name}</span>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Login Username</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. johndoe"
                    value={form.username}
                    onChange={e => setForm({...form, username: e.target.value})}
                    style={fieldErrors.username ? { borderColor: "var(--color-danger)" } : undefined}
                  />
                  {fieldErrors.username && <span style={{ fontSize: "0.7rem", color: "var(--color-danger)" }}>{fieldErrors.username}</span>}
                </div>
                <div className="form-group">
                  <label>Login Password</label>
                  <input
                    type="password"
                    className="form-control"
                    required
                    placeholder="e.g. secret123 (min. 6 characters)"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    style={fieldErrors.password ? { borderColor: "var(--color-danger)" } : undefined}
                  />
                  {fieldErrors.password && <span style={{ fontSize: "0.7rem", color: "var(--color-danger)" }}>{fieldErrors.password}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Office Region</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Southern Region (Bengaluru)"
                  value={form.region} 
                  onChange={e => setForm({...form, region: e.target.value})} 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    required
                    placeholder="jdoe@observebank.com"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    style={fieldErrors.email ? { borderColor: "var(--color-danger)" } : undefined}
                  />
                  {fieldErrors.email && <span style={{ fontSize: "0.7rem", color: "var(--color-danger)" }}>{fieldErrors.email}</span>}
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})}
                    style={fieldErrors.phone ? { borderColor: "var(--color-danger)" } : undefined}
                  />
                  {fieldErrors.phone && <span style={{ fontSize: "0.7rem", color: "var(--color-danger)" }}>{fieldErrors.phone}</span>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Initial Portfolio Value</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. ₹1.50Cr"
                    value={form.portfolioSize} 
                    onChange={e => setForm({...form, portfolioSize: e.target.value})} 
                  />
                </div>
                <div className="form-group">
                  <label>Target Conversion Rate</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. 75.0%"
                    value={form.conversionRate} 
                    onChange={e => setForm({...form, conversionRate: e.target.value})} 
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeAddModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, #3b82f6 100%)", color: "#000" }}>Register RM</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: "400px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3>Remove Relationship Manager</h3>
              <X size={16} style={{ cursor: "pointer", color: "var(--text-secondary)" }} onClick={() => setDeleteTarget(null)} />
            </div>
            <div style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid var(--color-danger)",
              borderRadius: "8px",
              padding: "0.75rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
              color: "var(--text-primary)",
              fontSize: "0.85rem",
              marginBottom: "1.25rem"
            }}>
              <ShieldAlert size={16} style={{ flexShrink: 0, color: "var(--color-danger)", marginTop: "1px" }} />
              <span>
                This will permanently remove <strong>{deleteTarget.name}</strong>'s login and RM profile
                (<span style={{ fontFamily: "monospace" }}>{deleteTarget.username}</span>). This cannot be undone.
              </span>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: "var(--color-danger)", color: "#fff" }}
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Removing..." : "Remove RM"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
