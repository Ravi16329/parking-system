import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSlots,
  adminReleaseSlot,
  getAnnouncements,
  adminPostAnnouncement,
  adminDeleteAnnouncement,
  adminLogout,
} from "../api/api";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [token] = useState(() => sessionStorage.getItem("adminToken"));

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [releasingId, setReleasingId] = useState(null);

  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");

  const handleAuthError = useCallback(
    (err) => {
      if (err?.message === "UNAUTHORIZED") {
        sessionStorage.removeItem("adminToken");
        navigate("/admin");
        return true;
      }
      return false;
    },
    [navigate]
  );

  const loadSlots = useCallback(() => {
    setSlotsLoading(true);
    getSlots()
      .then((all) => setSlots(all.filter((s) => s.status !== "available")))
      .catch(() => setError("Couldn't load slots."))
      .finally(() => setSlotsLoading(false));
  }, []);

  const loadAnnouncements = useCallback(() => {
    setAnnouncementsLoading(true);
    getAnnouncements()
      .then(setAnnouncements)
      .catch(() => setError("Couldn't load announcements."))
      .finally(() => setAnnouncementsLoading(false));
  }, []);

  useEffect(() => {
    if (!token) {
      navigate("/admin");
      return;
    }
    loadSlots();
    loadAnnouncements();
  }, [token, navigate, loadSlots, loadAnnouncements]);

  async function handleRelease(slotId) {
    if (releasingId) return;
    setReleasingId(slotId);
    setError("");
    try {
      await adminReleaseSlot(slotId, token);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err) {
      if (!handleAuthError(err)) setError(err.message || "Couldn't release that slot.");
    } finally {
      setReleasingId(null);
    }
  }

  async function handlePost(e) {
    e.preventDefault();
    if (!newMessage.trim() || posting) return;
    setPosting(true);
    setError("");
    try {
      const saved = await adminPostAnnouncement(newMessage.trim(), token);
      setAnnouncements((prev) => [saved, ...prev]);
      setNewMessage("");
    } catch (err) {
      if (!handleAuthError(err)) setError(err.message || "Couldn't post that announcement.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id) {
    if (deletingId) return;
    setDeletingId(id);
    setError("");
    try {
      await adminDeleteAnnouncement(id, token);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      if (!handleAuthError(err)) setError(err.message || "Couldn't delete that announcement.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLogout() {
    await adminLogout(token);
    sessionStorage.removeItem("adminToken");
    navigate("/admin");
  }

  if (!token) return null; // redirect effect above will navigate away

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="title">Admin Dashboard</h1>
          <p className="subtitle">Manage held/occupied slots and site announcements</p>
        </div>
        <button className="btn btn-secondary" onClick={handleLogout}>
          Log Out
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-grid">
        {/* ---------------- slots needing attention ---------------- */}
        <section className="admin-card">
          <h2 className="admin-card-heading">
            Held / occupied slots
            {!slotsLoading && <span className="admin-count">{slots.length}</span>}
          </h2>

          {slotsLoading ? (
            <p className="admin-muted">Loading…</p>
          ) : slots.length === 0 ? (
            <p className="admin-muted">Nothing to manage right now — every bay is free.</p>
          ) : (
            <ul className="admin-slot-list">
              {slots
                .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
                .map((slot) => (
                  <li key={slot.id} className="admin-slot-row">
                    <div className="admin-slot-info">
                      <strong>{slot.id}</strong>
                      <span className="admin-slot-floor">Floor {slot.floor}</span>
                      <span className={`admin-slot-badge status-${slot.status}`}>{slot.status}</span>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleRelease(slot.id)}
                      disabled={releasingId === slot.id}
                    >
                      {releasingId === slot.id ? "Releasing…" : "Release"}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </section>

        {/* ---------------- announcements ---------------- */}
        <section className="admin-card">
          <h2 className="admin-card-heading">Announcements</h2>

          <form className="admin-announce-form" onSubmit={handlePost}>
            <textarea
              rows={3}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="e.g. Floor 2 water leak — Floor 2 bays closed until further notice"
              maxLength={500}
            />
            <button className="btn btn-primary" type="submit" disabled={posting || !newMessage.trim()}>
              {posting ? "Posting…" : "Post announcement"}
            </button>
          </form>

          {announcementsLoading ? (
            <p className="admin-muted">Loading…</p>
          ) : announcements.length === 0 ? (
            <p className="admin-muted">No announcements posted yet.</p>
          ) : (
            <ul className="admin-announce-list">
              {announcements.map((a) => (
                <li key={a.id} className="admin-announce-row">
                  <div>
                    <p className="admin-announce-message">{a.message}</p>
                    <span className="admin-announce-time">
                      {new Date(a.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <button
                    className="btn-link-danger"
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                  >
                    {deletingId === a.id ? "…" : "Delete"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
