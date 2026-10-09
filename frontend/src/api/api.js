const BASE_URL = "https://parking-system-ywfx.onrender.com/api";

// Must mirror the backend's app.slot.hold-minutes (application.properties).
// Used client-side only to render the countdown — the backend is always the
// real source of truth for when a hold actually expires.
export const HOLD_MINUTES = 3;

async function asJson(res) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Backend enum values come back as "AVAILABLE" / "HELD" / "OCCUPIED"; the
// rest of the app (SlotSelection, HomePage) checks lowercase strings.
function normalizeSlot(raw) {
  if (!raw) return raw;
  return { ...raw, status: String(raw.status).toLowerCase() };
}

// Same idea for bookings: backend Status enum (HELD/CONFIRMED/...) -> lowercase.
function normalizeBooking(raw) {
  if (!raw) return raw;
  return { ...raw, status: String(raw.status).toLowerCase() };
}

// ---------------------------------------------------------------------------
// Apartment + slots — all backed by the real database now
// ---------------------------------------------------------------------------
export async function getApartment() {
  const data = await import("../data/apartment.json");
  const slots = await getSlots();
  // totalSlots comes from the real slot table, not the static JSON, so the
  // home page can never disagree with the garage.
  return { ...data.default, totalSlots: slots.length };
}

export async function getSlots() {
  const res = await fetch(`${BASE_URL}/slots`);
  if (!res.ok) throw new Error(`getSlots failed: ${res.status}`);
  const data = await asJson(res);
  return (data || []).map(normalizeSlot);
}

export async function getSlotStats() {
  const slots = await getSlots();
  return {
    total: slots.length,
    available: slots.filter((s) => s.status === "available").length,
    held: slots.filter((s) => s.status === "held").length,
    occupied: slots.filter((s) => s.status === "occupied").length,
  };
}

/**
 * Attempts to hold a slot. Returns:
 *   { success: true, slot }               on success
 *   { success: false, message }           if someone else already holds/took it
 * Callers (SlotSelection) must check `success` — a hold is NOT guaranteed
 * just because this resolves, since another user's request may have won
 * the same bay a moment earlier.
 */
export async function holdSlot(slotId) {
  const res = await fetch(`${BASE_URL}/slots/${slotId}/hold`, { method: "POST" });
  const data = await asJson(res);

  if (res.status === 409) {
    return { success: false, message: data?.message || "That slot was just taken." };
  }
  if (!res.ok) {
    return { success: false, message: "Couldn't hold that slot. Try again." };
  }
  return { success: true, slot: normalizeSlot(data) };
}

export async function releaseSlot(slotId) {
  const res = await fetch(`${BASE_URL}/slots/${slotId}/release`, { method: "POST" });
  return res.ok;
}

/** Marks a slot permanently taken once payment succeeds — clears its hold timer. */
export async function occupySlot(slotId) {
  const res = await fetch(`${BASE_URL}/slots/${slotId}/occupy`, { method: "POST" });
  return res.ok;
}

// ---------------------------------------------------------------------------
// OTP — local stub for now (backend endpoints already exist, see OtpController)
// ---------------------------------------------------------------------------
const otpCodes = new Map(); // phone -> { code, expiresAt }
const OTP_TTL_MS = 2 * 60 * 1000;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function sendOtp(phone) {
  // Live version, once the frontend is wired to the backend:
  // const res = await fetch(`${BASE_URL}/otp/send`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ phone }),
  // });
  // return res.json();

  await delay(700);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpCodes.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });
  console.info(`[demo] OTP for ${phone}: ${code}`);
  return { success: true, phone, expiresInSec: OTP_TTL_MS / 1000, devCode: code };
}

export async function verifyOtp(phone, code) {
  // Live version:
  // const res = await fetch(`${BASE_URL}/otp/verify`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ phone, code }),
  // });
  // return res.json();

  await delay(600);
  const entry = otpCodes.get(phone);
  if (!entry || Date.now() > entry.expiresAt) {
    return { success: false, message: "That code has expired. Send a new one." };
  }
  if (entry.code !== code) {
    return { success: false, message: "Wrong code. Check the SMS and try again." };
  }
  otpCodes.delete(phone);
  return { success: true, phone };
}

// ---------------------------------------------------------------------------
// Bookings + payment — both persisted on the real backend now, so a booking
// survives a refresh and shows up in getBookingHistory() for its phone number.
// ---------------------------------------------------------------------------
export async function createBooking({ slotId, name, phone }) {
  const res = await fetch(`${BASE_URL}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotId, name, phone }),
  });
  if (!res.ok) throw new Error(`createBooking failed: ${res.status}`);
  return normalizeBooking(await asJson(res));
}

export async function getBooking(bookingId) {
  const res = await fetch(`${BASE_URL}/bookings/${bookingId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getBooking failed: ${res.status}`);
  return normalizeBooking(await asJson(res));
}

/** A phone number's past bookings, newest first — shown once it's OTP-verified. */
export async function getBookingHistory(phone) {
  const res = await fetch(`${BASE_URL}/bookings/history/${phone}`);
  if (!res.ok) throw new Error(`getBookingHistory failed: ${res.status}`);
  const data = await asJson(res);
  return (data || []).map(normalizeBooking);
}

/**
 * Dummy gateway for now — server-side always "succeeds" and confirms the
 * booking (see PaymentServiceImpl). Swap in real Razorpay checkout here
 * later: open Razorpay's widget with an order id from a new "create order"
 * call, then POST razorpay_payment_id/order_id/signature to this same
 * endpoint instead of just { bookingId, method }.
 */
export async function payForBooking({ bookingId, method }) {
  const res = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId, method }),
  });
  if (!res.ok) throw new Error(`payForBooking failed: ${res.status}`);
  return normalizeBooking(await asJson(res));
}

// ---------------------------------------------------------------------------
// Admin — fixed-password login (see AdminAuthService on the backend). The
// token this returns is kept in sessionStorage by AdminLogin/AdminDashboard
// and sent back as the X-Admin-Token header on every admin call.
// ---------------------------------------------------------------------------
export async function adminLogin(password) {
  const res = await fetch(`${BASE_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await asJson(res).catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Incorrect password");
  return data; // { token }
}

export async function adminLogout(token) {
  await fetch(`${BASE_URL}/admin/logout`, {
    method: "POST",
    headers: { "X-Admin-Token": token || "" },
  }).catch(() => { });
}

function adminHeaders(token, hasBody) {
  const headers = { "X-Admin-Token": token || "" };
  if (hasBody) headers["Content-Type"] = "application/json";
  return headers;
}

/** Force-releases any slot (HELD or OCCUPIED) back to AVAILABLE. */
export async function adminReleaseSlot(slotId, token) {
  const res = await fetch(`${BASE_URL}/admin/slots/${slotId}/release`, {
    method: "POST",
    headers: adminHeaders(token),
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error("Couldn't release that slot.");
  return true;
}

/** Admin walk-in booking: marks a free slot occupied and records who it's for. */
export async function adminBookSlot(slotId, { name, phone }, token) {
  const res = await fetch(`${BASE_URL}/admin/slots/${slotId}/book`, {
    method: "POST",
    headers: adminHeaders(token, true),
    body: JSON.stringify({ name, phone }),
  });
  const data = await asJson(res).catch(() => null);
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(data?.message || `Couldn't book that slot (HTTP ${res.status}).`);
  return normalizeBooking(data);
}

/** Public — anyone can read the posted announcements (e.g. the home page). */
export async function getAnnouncements() {
  const res = await fetch(`${BASE_URL}/announcements`);
  if (!res.ok) throw new Error("getAnnouncements failed");
  return (await asJson(res)) || [];
}

export async function adminPostAnnouncement(message, token) {
  const res = await fetch(`${BASE_URL}/admin/announcements`, {
    method: "POST",
    headers: adminHeaders(token, true),
    body: JSON.stringify({ message }),
  });
  const data = await asJson(res).catch(() => null);
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(data?.message || "Couldn't post that announcement.");
  return data;
}

export async function adminDeleteAnnouncement(id, token) {
  const res = await fetch(`${BASE_URL}/admin/announcements/${id}`, {
    method: "DELETE",
    headers: adminHeaders(token),
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  return res.ok;
}


export async function createPaymentOrder(bookingId) {
  const res = await fetch(`${BASE_URL}/payments/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bookingId }),
  });

  if (!res.ok) {
    throw new Error("Failed to create payment order");
  }

  return await res.json();
}


export async function verifyPayment({
  bookingId,
  razorpayPaymentId,
  razorpayOrderId,
  razorpaySignature,
}) {
  const res = await fetch(`${BASE_URL}/payments/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bookingId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    }),
  });

  if (!res.ok) {
    throw new Error("Payment verification failed");
  }

  return normalizeBooking(await asJson(res));
}


export async function getQrByBooking(bookingId) {
  const res = await fetch(`${BASE_URL}/qr/booking/${bookingId}`);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error("Failed to get parking QR");
  }

  return await res.json();
}

export async function adminVerifyQr(token, adminToken) {
  const res = await fetch(
    `${BASE_URL}/qr/verify?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: {
        "X-Admin-Token": adminToken || "",
      },
    }
  );

  const data = await asJson(res).catch(() => null);

  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!res.ok) {
    throw new Error(
      data?.message ||
      (res.status === 404
        ? "Invalid QR code"
        : "QR code has already been used or cannot be verified")
    );
  }

  return data;
}


async function adminVerifyEntryQr(token, adminToken) {
  return adminVerifyQrAction("entry", token, adminToken);
}

async function adminVerifyExitQr(token, adminToken) {
  return adminVerifyQrAction("exit", token, adminToken);
}

async function adminVerifyQrAction(action, token, adminToken) {
  const res = await fetch(
    `${BASE_URL}/qr/${action}?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: {
        "X-Admin-Token": adminToken || "",
      },
    }
  );

  const data = await asJson(res).catch(() => null);

  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!res.ok) {
    throw new Error(
      data?.message ||
      (res.status === 404
        ? "Invalid QR code"
        : `QR ${action} check failed`)
    );
  }

  return data;
}

export { adminVerifyEntryQr, adminVerifyExitQr };