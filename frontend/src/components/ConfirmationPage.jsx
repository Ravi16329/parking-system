import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import {
  getBookingHistory,
  getQrByBooking,
} from "../api/api";
import "./ConfirmationPage.css";

function buildReceiptPdf(booking) {
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFillColor(28, 110, 74);
  doc.rect(0, 0, pageWidth, 70, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(
    "Smart Parking — Payment Receipt",
    centerX,
    34,
    { align: "center" }
  );

  doc.setFontSize(10);
  doc.text(
    "Green Meadows Apartments",
    centerX,
    52,
    { align: "center" }
  );

  doc.setTextColor(31, 42, 36);

  let y = 100;

  const row = (label, value) => {
    doc.setFontSize(10);
    doc.setTextColor(107, 122, 114);
    doc.text(label, 40, y);

    doc.setFontSize(12);
    doc.setTextColor(31, 42, 36);
    doc.text(String(value), 40, y + 16);

    y += 40;
  };

  row("Booking ID", booking.bookingId);
  row("Slot", booking.slotId);
  row("Name", booking.name);
  row("Phone", booking.phone);
  row(
    "Status",
    (booking.status || "confirmed").toUpperCase()
  );
  row("Amount paid", "\u20B950.00");
  row("Issued", new Date().toLocaleString());

  doc.setDrawColor(225, 231, 227);
  doc.line(40, y, pageWidth - 40, y);

  doc.setFontSize(9);
  doc.setTextColor(107, 122, 114);

  doc.text(
    "This is a simulated receipt for a test-mode payment — no real transaction occurred.",
    centerX,
    y + 20,
    {
      align: "center",
      maxWidth: pageWidth - 80,
    }
  );

  doc.save(`receipt-${booking.bookingId}.pdf`);
}

export default function ConfirmationPage({ booking }) {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [qr, setQr] = useState(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState("");

  // --------------------------------------------------
  // Load previous booking history
  // --------------------------------------------------

  useEffect(() => {
    if (!booking?.phone) return;

    let cancelled = false;

    setHistoryLoading(true);

    getBookingHistory(booking.phone)
      .then((rows) => {
        if (!cancelled) {
          setHistory(
            rows.filter(
              (b) => b.bookingId !== booking.bookingId
            )
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistory([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [booking?.phone, booking?.bookingId]);

  // --------------------------------------------------
  // Load backend-generated parking QR
  // --------------------------------------------------

  useEffect(() => {
    if (!booking?.bookingId) return;

    let cancelled = false;

    setQrLoading(true);
    setQrError("");
    setQr(null);

    getQrByBooking(booking.bookingId)
      .then((data) => {
        if (!cancelled) {
          setQr(data);
        }
      })
      .catch((error) => {
        console.error("QR loading error:", error);

        if (!cancelled) {
          setQrError(
            "Unable to load your parking QR. Please refresh the page."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setQrLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [booking?.bookingId]);

  // --------------------------------------------------
  // No booking
  // --------------------------------------------------

  if (!booking) {
    return (
      <div className="page">
        <div className="container">
          <div className="card">
            <p>No booking found.</p>

            <button
              className="btn btn-primary"
              onClick={() => navigate("/")}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">

        <div className="card confirmation-card">

          {/* Progress */}
          <div className="progress">
            <span className="progress-step active" />
            <span className="progress-step active" />
            <span className="progress-step active" />
            <span className="progress-step active" />
          </div>

          {/* Success */}
          <div className="success-badge">
            ✅
          </div>

          <h1 className="title">
            Booking Confirmed!
          </h1>

          <p className="subtitle">
            Show this QR code at the entrance
          </p>

          {/* --------------------------------------------------
              BACKEND GENERATED QR
          -------------------------------------------------- */}

          <div className="qr-wrapper">

            {qrLoading && (
              <div>
                <p>Loading parking QR...</p>
              </div>
            )}

            {!qrLoading && qrError && (
              <div>
                <p>{qrError}</p>

                <button
                  className="btn btn-secondary"
                  onClick={() => window.location.reload()}
                >
                  Refresh
                </button>
              </div>
            )}

            {!qrLoading && !qrError && qr && (
              <>
                <QRCodeSVG
                  value={qr.token}
                  size={180}
                  level="H"
                />

                <p
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    color: "#6b7a72",
                  }}
                >
                  Show this QR code at the parking entrance.
                </p>

                <p
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: "#8a968f",
                  }}
                >
                  QR Status: {qr.status}
                </p>
              </>
            )}

            {!qrLoading && !qrError && !qr && (
              <div>
                <p>
                  Parking QR is not available.
                </p>

                <button
                  className="btn btn-secondary"
                  onClick={() => window.location.reload()}
                >
                  Refresh
                </button>
              </div>
            )}

          </div>

          {/* Booking summary */}
          <div className="booking-summary">

            <div>
              <span>Booking ID</span>
              <strong>
                {booking.bookingId}
              </strong>
            </div>

            <div>
              <span>Slot</span>
              <strong>
                {booking.slotId}
              </strong>
            </div>

            <div>
              <span>Name</span>
              <strong>
                {booking.name}
              </strong>
            </div>

            <div>
              <span>Phone</span>
              <strong>
                {booking.phone}
              </strong>
            </div>

            <div>
              <span>Status</span>

              <strong className="status-confirmed">
                {booking.status}
              </strong>
            </div>

          </div>

          {/* Receipt */}
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 16 }}
            onClick={() => buildReceiptPdf(booking)}
          >
            Download receipt (PDF)
          </button>

          {/* Home */}
          <button
            className="btn btn-secondary btn-block"
            style={{ marginTop: 10 }}
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>

          {/* Previous bookings */}
          {(historyLoading || history.length > 0) && (
            <div className="history-block">

              <h2 className="history-heading">
                Your previous bookings
              </h2>

              {historyLoading ? (
                <p className="history-loading">
                  Loading…
                </p>
              ) : (
                <ul className="history-list">

                  {history.map((b) => (
                    <li
                      key={b.bookingId}
                      className="history-row"
                    >
                      <div>
                        <strong>
                          {b.slotId}
                        </strong>

                        <span className="history-id">
                          {b.bookingId}
                        </span>
                      </div>

                      <span
                        className={`history-status status-${b.status}`}
                      >
                        {b.status}
                      </span>
                    </li>
                  ))}

                </ul>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}