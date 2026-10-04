import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../api/api";
import "./AdminLogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError("");
    try {
      const { token } = await adminLogin(password);
      sessionStorage.setItem("adminToken", token);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <h1 className="title">Admin Login</h1>
        <p className="subtitle">Manage slots and site announcements</p>

        <label className="admin-login-label" htmlFor="admin-password">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter admin password"
        />

        {error && <div className="admin-login-error">{error}</div>}

        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? "Checking…" : "Log In"}
        </button>
      </form>
    </div>
  );
}
