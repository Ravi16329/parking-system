
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    sendOtp,
    verifyOtp,
    getBookingHistory,
} from "../api/api";
import ExtensionControls from "./ExtensionControls";

const HOURLY_RATE = 50;

function formatDate(value) {
    if (!value) return "Not available";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleString();
}

function getAmount(booking) {
    if (booking.amount != null) return Number(booking.amount);
    return Number(booking.durationHours || 1) * HOURLY_RATE;
}

export default function BookingHistory() {
    const navigate = useNavigate();

    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [devCode, setDevCode] = useState("");
    const [step, setStep] = useState("phone");
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function requestOtp(event) {
        event.preventDefault();
        setError("");

        if (!/^[6-9]\d{9}$/.test(phone)) {
            setError("Enter a valid 10-digit Indian mobile number.");
            return;
        }

        setLoading(true);
        try {
            const result = await sendOtp(phone);

            if (!result?.success) {
                throw new Error(result?.message || "Could not send OTP.");
            }

            setDevCode(result.devCode || "");
            setOtp("");
            setStep("otp");
        } catch (e) {
            setError(e.message || "Could not send OTP.");
        } finally {
            setLoading(false);
        }
    }

    async function verifyAndLoad(event) {
        event.preventDefault();
        setError("");

        if (!/^\d{6}$/.test(otp)) {
            setError("Enter the complete 6-digit OTP.");
            return;
        }

        setLoading(true);
        try {
            const result = await verifyOtp(phone, otp);

            if (!result?.success) {
                throw new Error(result?.message || "Invalid OTP.");
            }

            const rows = await getBookingHistory(phone);

            // The API normally returns newest first. Sort again here so the
            // extension control is always associated with the newest booking.
            const sorted = [...rows].sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });

            setBookings(sorted);
            setStep("history");
            setDevCode("");
        } catch (e) {
            setError(
                e.message || "Could not verify your number or load bookings."
            );
        } finally {
            setLoading(false);
        }
    }

    function updateBooking(updated) {
        setBookings((previous) =>
            previous.map((item) =>
                item.bookingId === updated.bookingId
                    ? { ...item, ...updated }
                    : item
            )
        );
    }

    return (
        <div className="page">
            <div className="container">
                <div className="card" style={{ maxWidth: 760, margin: "0 auto" }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate("/")}
                    >
                        ← Back to Home
                    </button>

                    <h1 className="title" style={{ marginTop: 22 }}>
                        Booking History
                    </h1>

                    {step === "phone" && (
                        <>
                            <p className="subtitle">
                                Enter the mobile number used for your parking bookings.
                            </p>

                            <form onSubmit={requestOtp}>
                                <div className="form-group">
                                    <label htmlFor="history-phone">
                                        Mobile number
                                    </label>
                                    <div className="phone-field">
                                        <span className="cc">+91</span>
                                        <input
                                            id="history-phone"
                                            type="tel"
                                            inputMode="numeric"
                                            autoComplete="tel-national"
                                            maxLength={10}
                                            value={phone}
                                            onChange={(e) =>
                                                setPhone(
                                                    e.target.value.replace(/\D/g, "").slice(0, 10)
                                                )
                                            }
                                            placeholder="9876543210"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    className="btn btn-primary btn-block"
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading ? "Sending OTP…" : "Send OTP"}
                                </button>
                            </form>
                        </>
                    )}

                    {step === "otp" && (
                        <>
                            <p className="subtitle">
                                Enter the verification code for +91 {phone}.
                            </p>

                            <form onSubmit={verifyAndLoad}>
                                <div className="form-group">
                                    <label htmlFor="history-otp">6-digit OTP</label>
                                    <input
                                        id="history-otp"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) =>
                                            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                                        }
                                        placeholder="Enter OTP"
                                        required
                                    />
                                </div>

                                {devCode && (
                                    <p className="dev-hint">
                                        Demo mode — your code is <strong>{devCode}</strong>.
                                    </p>
                                )}

                                <button
                                    className="btn btn-primary btn-block"
                                    type="submit"
                                    disabled={loading || otp.length !== 6}
                                >
                                    {loading ? "Verifying…" : "Verify and view bookings"}
                                </button>

                                <button
                                    className="btn btn-secondary btn-block"
                                    type="button"
                                    style={{ marginTop: 10 }}
                                    disabled={loading}
                                    onClick={() => {
                                        setStep("phone");
                                        setOtp("");
                                        setDevCode("");
                                        setError("");
                                    }}
                                >
                                    Change mobile number
                                </button>
                            </form>
                        </>
                    )}

                    {error && (
                        <p role="alert" style={{ color: "#b42318", marginTop: 14 }}>
                            {error}
                        </p>
                    )}

                    {step === "history" && (
                        <>
                            <p className="subtitle">
                                Bookings for +91 {phone}
                            </p>

                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setStep("phone");
                                    setBookings([]);
                                    setPhone("");
                                    setOtp("");
                                    setError("");
                                }}
                            >
                                Check another number
                            </button>

                            {bookings.length === 0 ? (
                                <p style={{ marginTop: 24 }}>
                                    No bookings were found for this number.
                                </p>
                            ) : (
                                <div style={{ display: "grid", gap: 16, marginTop: 22 }}>
                                    {bookings.map((booking, index) => (
                                        <div
                                            key={booking.bookingId}
                                            style={{
                                                border: "1px solid #e0e5e1",
                                                borderRadius: 14,
                                                padding: 16,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    gap: 12,
                                                    flexWrap: "wrap",
                                                }}
                                            >
                                                <strong>{booking.slotId}</strong>
                                                <span>{String(booking.status || "").toUpperCase()}</span>
                                            </div>

                                            <p>
                                                Booking ID: <strong>{booking.bookingId}</strong>
                                            </p>
                                            <p>Booked: {formatDate(booking.createdAt)}</p>
                                            <p>
                                                Duration: {booking.durationHours || 1} hour(s)
                                            </p>
                                            <p>
                                                Amount: ₹{getAmount(booking).toFixed(2)}
                                            </p>
                                            <p>
                                                Scheduled end: {formatDate(booking.scheduledEndAt)}
                                            </p>

                                            {index === 0 && (
                                                <div style={{ marginTop: 12 }}>
                                                    <p style={{ fontWeight: 600 }}>
                                                        Latest booking
                                                    </p>
                                                    <ExtensionControls
                                                        booking={booking}
                                                        onUpdated={updateBooking}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
