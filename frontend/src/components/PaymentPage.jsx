import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { payForBooking, releaseSlot } from "../api/api";
import HoldCountdown from "./HoldCountdown";
import "./PaymentPage.css";

const AMOUNT = 50;

function UpiIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 12h6l3-8 3 16 3-8h1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="5" width="19" height="14" rx="2.4" />
      <path d="M2.5 9.5h19" strokeLinecap="round" />
      <path d="M6 15h4" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

export default function PaymentPage({
  booking,
  setBooking,
  setSelectedSlotId,
  holdExpiresAt,
  setHoldExpiresAt,
}) {
  const navigate = useNavigate();
  const [method, setMethod] = useState("UPI");
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [payError, setPayError] = useState("");
  const [expired, setExpired] = useState(false);

  const handleHoldExpire = useCallback(() => setExpired(true), []);

  if (!booking) {
    return (
      <div className="payment-page">
        <div className="payment-empty-card">
          <p>No booking in progress.</p>
          <button className="btn btn-primary" onClick={() => navigate("/slots")}>
            Start a Booking
          </button>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="payment-page">
        <div className="payment-empty-card">
          <p>
            Your hold on <strong>{booking.slotId}</strong> expired before payment completed, so
            it's been released back to the garage.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setBooking(null);
              setSelectedSlotId?.(null);
              setHoldExpiresAt?.(null);
              navigate("/slots");
            }}
          >
            Choose a slot
          </button>
        </div>
      </div>
    );
  }

  async function handlePay() {
    if (processing || cancelling) return;
    setProcessing(true);
    setPayError("");
    try {
      // Simulated delay so the "processing" state is visible in the demo.
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Dummy gateway for now — PaymentServiceImpl on the backend always
      // "succeeds" and confirms the booking. When Razorpay is wired in,
      // this is where checkout.js opens instead, and payForBooking() gets
      // called with the razorpay_payment_id/order_id/signature it returns
      // instead of just { bookingId, method }.
      const result = await payForBooking({ bookingId: booking.bookingId, method });
      setBooking({ ...booking, ...result });
      setHoldExpiresAt?.(null); // paid — the slot is OCCUPIED now, not HELD
      navigate("/confirmation");
    } catch (err) {
      setPayError("Payment failed — please try again.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel() {
    if (cancelling || processing) return;
    setCancelling(true);
    // Release right away rather than waiting for the 3-minute hold timeout,
    // so the bay is free for someone else the moment this user backs out.
    await releaseSlot(booking.slotId);
    setBooking(null);
    setSelectedSlotId?.(null);
    setHoldExpiresAt?.(null);
    navigate("/slots");
  }

  return (
    <div className="payment-page">
      <div className="payment-shell">
        {/* ---------------- left: order summary ---------------- */}
        <div className="payment-summary-panel">
          <button type="button" className="payment-back-btn" onClick={handleCancel} disabled={processing || cancelling}>
            ← Back
          </button>

          <div className="progress">
            <span className="progress-step active" />
            <span className="progress-step active" />
            <span className="progress-step active" />
            <span className="progress-step" />
          </div>

          <div className="panel-chip-row">
            <span className="test-mode-chip">Test mode · no real charge</span>
            <HoldCountdown expiresAt={holdExpiresAt} onExpire={handleHoldExpire} />
          </div>

          <h1 className="title">Confirm &amp; pay</h1>
          <p className="subtitle">Review your reservation before paying</p>

          <div className="summary-rows">
            <div className="row">
              <span>Slot</span>
              <strong>{booking.slotId}</strong>
            </div>
            <div className="row">
              <span>Booking ID</span>
              <strong>{booking.bookingId}</strong>
            </div>
            <div className="row">
              <span>Name</span>
              <strong>{booking.name}</strong>
            </div>
          </div>

          <div className="amount-block">
            <span>Amount payable</span>
            <strong>₹{AMOUNT.toFixed(2)}</strong>
          </div>
        </div>

        {/* ---------------- right: payment action ---------------- */}
        <div className="payment-action-panel">
          <h2 className="panel-heading">Choose a payment method</h2>

          <div className="method-grid">
            <button
              type="button"
              className={`method-tile ${method === "UPI" ? "selected" : ""}`}
              onClick={() => setMethod("UPI")}
              disabled={processing || cancelling}
            >
              <span className="method-icon"><UpiIcon /></span>
              <span>UPI</span>
            </button>
            <button
              type="button"
              className={`method-tile ${method === "CARD" ? "selected" : ""}`}
              onClick={() => setMethod("CARD")}
              disabled={processing || cancelling}
            >
              <span className="method-icon"><CardIcon /></span>
              <span>Card</span>
            </button>
          </div>

          {payError && <div className="pay-error">{payError}</div>}

          <button
            className="btn-pay"
            onClick={handlePay}
            disabled={processing || cancelling}
          >
            {processing ? (
              <>
                <span className="spinner" /> Processing…
              </>
            ) : (
              `Pay ₹${AMOUNT.toFixed(2)} with ${method === "UPI" ? "UPI" : "Card"}`
            )}
          </button>

          <button
            type="button"
            className="link-cancel"
            onClick={handleCancel}
            disabled={processing || cancelling}
          >
            {cancelling ? "Releasing slot…" : "Cancel and release slot"}
          </button>

          <p className="secure-note">
            <LockIcon /> Payments are simulated in this build — no real transaction occurs.
          </p>
        </div>
      </div>
    </div>
  );
}