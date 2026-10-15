import React, { useState } from "react";
import { createExtensionPaymentOrder, verifyPayment } from "../api/api";

export default function ExtensionControls({ booking, onUpdated }) {
    const [hours, setHours] = useState(1);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    if (!booking || String(booking.status).toLowerCase() !== "confirmed") return null;

    async function extendParking() {
        if (busy) return;
        setBusy(true); setMessage(""); setError("");
        try {
            if (!window.Razorpay) throw new Error("Razorpay Checkout is not loaded. Refresh the page and try again.");
            const order = await createExtensionPaymentOrder(booking.bookingId, hours);
            const options = {
                key: order.keyId, amount: order.amount, currency: order.currency,
                name: "Smart Parking", description: `Extend ${booking.slotId} by ${hours} hour(s)`,
                order_id: order.orderId, prefill: { name: booking.name, contact: booking.phone }, theme: { color: "#111827" },
                handler: async (response) => {
                    try {
                        const updated = await verifyPayment({ bookingId: booking.bookingId, razorpayPaymentId: response.razorpay_payment_id, razorpayOrderId: response.razorpay_order_id, razorpaySignature: response.razorpay_signature });
                        onUpdated?.(updated); setMessage(`Parking extended. New end time: ${updated.scheduledEndAt ? new Date(updated.scheduledEndAt).toLocaleString() : "updated"}.`);
                    } catch (e) { setError(e.message || "Extension payment verification failed."); }
                    finally { setBusy(false); }
                },
                modal: { ondismiss: () => setBusy(false) },
            };
            const checkout = new window.Razorpay(options);
            checkout.on("payment.failed", (response) => { setError(response.error?.description || "Extension payment failed."); setBusy(false); });
            checkout.open();
        } catch (e) { setError(e.message || "Could not start extension payment."); setBusy(false); }
    }

    return <div className="extension-controls" style={{ marginTop: 12, padding: 12, border: "1px solid #dce5df", borderRadius: 12 }}>
        <strong>Extend parking</strong>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
            <label htmlFor={`extend-${booking.bookingId}`}>Extra hours</label>
            <input id={`extend-${booking.bookingId}`} type="number" min="1" step="1" value={hours} onChange={(e) => setHours(Math.max(1, Number(e.target.value) || 1))} disabled={busy} />
            <button type="button" className="btn btn-primary" onClick={extendParking} disabled={busy}>{busy ? "Processing…" : `Pay ₹${hours * 50} to extend`}</button>
        </div>
        <small>Extension is applied only after Razorpay payment is verified.</small>
        {message && <p role="status" style={{ color: "#187344" }}>{message}</p>}
        {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
    </div>;
}
