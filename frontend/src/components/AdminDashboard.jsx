import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSlots,
  adminReleaseSlot,
  adminBookSlot,
  getAnnouncements,
  adminPostAnnouncement,
  adminDeleteAnnouncement,
  adminLogout,
} from "../api/api";
import "./AdminDashboard.css";

const byId = (a, b) => a.id.localeCompare(b.id, undefined, { numeric: true });

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [token] = useState(() => sessionStorage.getItem("adminToken"));

  const [allSlots, setAllSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [releasingId, setReleasingId] = useState(null);

  // walk-in booking form
  const [bookSlotId, setBookSlotId] = useState("");
  const [bookName, setBookName] = useState("");
  const [bookPhone, setBookPhone] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookSuccess, setBookSuccess] = useState("");

  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");

  // held/occupied bays the admin may need to release, and free bays they can book
  const attentionSlots = useMemo(
    () => allSlots.filter((s) => s.status !== "available").sort(byId),
    [allSlots]
  );
  const freeSlots = useMemo(
    () => allSlots.filter((s) => s.status === "available").sort(byId),
    [allSlots]
  );

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
      .then((all) => setAllSlots(Array.isArray(all) ? all : []))
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
    setBookSuccess("");
    try {
      await adminReleaseSlot(slotId, token);
      // freed bay goes back to "available", so it shows up in the booking dropdown
      setAllSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, status: "available" } : s))
      );
    } catch (err) {
      if (!handleAuthError(err)) setError(err.message || "Couldn't release that slot.");
    } finally {
      setReleasingId(null);
    }
  }

  async function handleBook(e) {
    e.preventDefault();
    if (booking) return;
    setError("");
    setBookSuccess("");

    if (!bookSlotId) return setError("Pick a free slot first.");
    if (!bookName.trim()) return setError("Enter the driver's name.");
    if (!/^[0-9]{10}$/.test(bookPhone.trim())) {
      return setError("Enter a valid 10-digit phone number.");
    }

    setBooking(true);
    try {
      const result = await adminBookSlot(
        bookSlotId,
        { name: bookName.trim(), phone: bookPhone.trim() },
        token
      );
      setAllSlots((prev) =>
        prev.map((s) => (s.id === bookSlotId ? { ...s, status: "occupied" } : s))
      );
      setBookSuccess(
        `Slot ${bookSlotId} booked for ${bookName.trim()} (Booking ${result.bookingId}).`
      );
      setBookSlotId("");
      setBookName("");
      setBookPhone("");
    } catch (err) {
      if (!handleAuthError(err)) {
        setError(err.message || "Couldn't book that slot.");
        loadSlots(); // someone may have taken it; refresh the list
      }
    } finally {
      setBooking(false);
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
          <p className="subtitle">Book walk-in slots, manage held/occupied slots, and post announcements</p>
        </div>
        <button className="btn btn-secondary" onClick={handleLogout}>
          Log Out
        </button>

        <button onClick={() => navigate("/admin/check-qr")}>
          Entry Check
        </button>

        <button onClick={() => navigate("/admin/exit-check-qr")}>
          Exit Check
        </button>

      </div>

      {error && <div className="admin-error">{error}</div>}
      {bookSuccess && <div className="admin-success">{bookSuccess}</div>}

      <div className="admin-grid">
        {/* ---------------- walk-in booking ---------------- */}
        <section className="admin-card">
          <h2 className="admin-card-heading">
            Book a slot (walk-in)
            {!slotsLoading && <span className="admin-count">{freeSlots.length} free</span>}
          </h2>

          {slotsLoading ? (
            <p className="admin-muted">Loading…</p>
          ) : freeSlots.length === 0 ? (
            <p className="admin-muted">No free bays right now.</p>
          ) : (
            <form className="admin-book-form" onSubmit={handleBook}>
              <label>
                Slot
                <select value={bookSlotId} onChange={(e) => setBookSlotId(e.target.value)}>
                  <option value="">Select a free slot…</option>
                  {freeSlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} — Floor {s.floor}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Driver name
                <input
                  type="text"
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  placeholder="Rahul Sharma"
                />
              </label>

              <label>
                Phone number
                <input
                  type="tel"
                  value={bookPhone}
                  onChange={(e) => setBookPhone(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                />
              </label>

              <button className="btn btn-primary" type="submit" disabled={booking}>
                {booking ? "Booking…" : "Book slot"}
              </button>
            </form>
          )}
        </section>

        {/* ---------------- slots needing attention ---------------- */}
        <section className="admin-card">
          <h2 className="admin-card-heading">
            Held / occupied slots
            {!slotsLoading && <span className="admin-count">{attentionSlots.length}</span>}
          </h2>

          {slotsLoading ? (
            <p className="admin-muted">Loading…</p>
          ) : attentionSlots.length === 0 ? (
            <p className="admin-muted">Nothing to manage right now — every bay is free.</p>
          ) : (
            <ul className="admin-slot-list">
              {attentionSlots.map((slot) => (
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