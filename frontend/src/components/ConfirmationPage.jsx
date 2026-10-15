// import React, { useEffect, useState } from "react";
// import { QRCodeSVG } from "qrcode.react";
// import { useNavigate } from "react-router-dom";
// import jsPDF from "jspdf";
// import {
//   getBookingHistory,
//   getQrByBooking,
// } from "../api/api";
// import "./ConfirmationPage.css";

// function buildReceiptPdf(booking) {
//   const doc = new jsPDF({ unit: "pt", format: "a5" });
//   const pageWidth = doc.internal.pageSize.getWidth();
//   const centerX = pageWidth / 2;

//   doc.setFillColor(28, 110, 74);
//   doc.rect(0, 0, pageWidth, 70, "F");

//   doc.setTextColor(255, 255, 255);
//   doc.setFontSize(18);
//   doc.text(
//     "Smart Parking — Payment Receipt",
//     centerX,
//     34,
//     { align: "center" }
//   );

//   doc.setFontSize(10);
//   doc.text(
//     "Green Meadows Apartments",
//     centerX,
//     52,
//     { align: "center" }
//   );

//   doc.setTextColor(31, 42, 36);

//   let y = 100;

//   const row = (label, value) => {
//     doc.setFontSize(10);
//     doc.setTextColor(107, 122, 114);
//     doc.text(label, 40, y);

//     doc.setFontSize(12);
//     doc.setTextColor(31, 42, 36);
//     doc.text(String(value), 40, y + 16);

//     y += 40;
//   };

//   row("Booking ID", booking.bookingId);
//   row("Slot", booking.slotId);
//   row("Name", booking.name);
//   row("Phone", booking.phone);
//   row(
//     "Status",
//     (booking.status || "confirmed").toUpperCase()
//   );
//   row("Amount paid", "\u20B950.00");
//   row("Issued", new Date().toLocaleString());

//   doc.setDrawColor(225, 231, 227);
//   doc.line(40, y, pageWidth - 40, y);

//   doc.setFontSize(9);
//   doc.setTextColor(107, 122, 114);

//   doc.text(
//     "This is a simulated receipt for a test-mode payment — no real transaction occurred.",
//     centerX,
//     y + 20,
//     {
//       align: "center",
//       maxWidth: pageWidth - 80,
//     }
//   );

//   doc.save(`receipt-${booking.bookingId}.pdf`);
// }

// export default function ConfirmationPage({ booking }) {
//   const navigate = useNavigate();

//   const [history, setHistory] = useState([]);
//   const [historyLoading, setHistoryLoading] = useState(false);

//   const [qr, setQr] = useState(null);
//   const [qrLoading, setQrLoading] = useState(true);
//   const [qrError, setQrError] = useState("");

//   // --------------------------------------------------
//   // Load previous booking history
//   // --------------------------------------------------

//   useEffect(() => {
//     if (!booking?.phone) return;

//     let cancelled = false;

//     setHistoryLoading(true);

//     getBookingHistory(booking.phone)
//       .then((rows) => {
//         if (!cancelled) {
//           setHistory(
//             rows.filter(
//               (b) => b.bookingId !== booking.bookingId
//             )
//           );
//         }
//       })
//       .catch(() => {
//         if (!cancelled) {
//           setHistory([]);
//         }
//       })
//       .finally(() => {
//         if (!cancelled) {
//           setHistoryLoading(false);
//         }
//       });

//     return () => {
//       cancelled = true;
//     };
//   }, [booking?.phone, booking?.bookingId]);

//   // --------------------------------------------------
//   // Load backend-generated parking QR
//   // --------------------------------------------------

//   useEffect(() => {
//     if (!booking?.bookingId) return;

//     let cancelled = false;

//     setQrLoading(true);
//     setQrError("");
//     setQr(null);

//     getQrByBooking(booking.bookingId)
//       .then((data) => {
//         if (!cancelled) {
//           setQr(data);
//         }
//       })
//       .catch((error) => {
//         console.error("QR loading error:", error);

//         if (!cancelled) {
//           setQrError(
//             "Unable to load your parking QR. Please refresh the page."
//           );
//         }
//       })
//       .finally(() => {
//         if (!cancelled) {
//           setQrLoading(false);
//         }
//       });

//     return () => {
//       cancelled = true;
//     };
//   }, [booking?.bookingId]);

//   // --------------------------------------------------
//   // No booking
//   // --------------------------------------------------

//   if (!booking) {
//     return (
//       <div className="page">
//         <div className="container">
//           <div className="card">
//             <p>No booking found.</p>

//             <button
//               className="btn btn-primary"
//               onClick={() => navigate("/")}
//             >
//               Back to Home
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="page">
//       <div className="container">

//         <div className="card confirmation-card">

//           {/* Progress */}
//           <div className="progress">
//             <span className="progress-step active" />
//             <span className="progress-step active" />
//             <span className="progress-step active" />
//             <span className="progress-step active" />
//           </div>

//           {/* Success */}
//           <div className="success-badge">
//             ✅
//           </div>

//           <h1 className="title">
//             Booking Confirmed!
//           </h1>

//           <p className="subtitle">
//             Show this QR code at the entrance
//           </p>

//           {/* --------------------------------------------------
//               BACKEND GENERATED QR
//           -------------------------------------------------- */}

//           <div className="qr-wrapper">

//             {qrLoading && (
//               <div>
//                 <p>Loading parking QR...</p>
//               </div>
//             )}

//             {!qrLoading && qrError && (
//               <div>
//                 <p>{qrError}</p>

//                 <button
//                   className="btn btn-secondary"
//                   onClick={() => window.location.reload()}
//                 >
//                   Refresh
//                 </button>
//               </div>
//             )}

//             {!qrLoading && !qrError && qr && (
//               <>
//                 <QRCodeSVG
//                   value={qr.token}
//                   size={180}
//                   level="H"
//                 />

//                 <p
//                   style={{
//                     marginTop: 10,
//                     fontSize: 13,
//                     color: "#6b7a72",
//                   }}
//                 >
//                   Show this QR code at the parking entrance.
//                 </p>

//                 <p
//                   style={{
//                     marginTop: 4,
//                     fontSize: 12,
//                     color: "#8a968f",
//                   }}
//                 >
//                   QR Status: {qr.status}
//                 </p>
//               </>
//             )}

//             {!qrLoading && !qrError && !qr && (
//               <div>
//                 <p>
//                   Parking QR is not available.
//                 </p>

//                 <button
//                   className="btn btn-secondary"
//                   onClick={() => window.location.reload()}
//                 >
//                   Refresh
//                 </button>
//               </div>
//             )}

//           </div>

//           {/* Booking summary */}
//           <div className="booking-summary">

//             <div>
//               <span>Booking ID</span>
//               <strong>
//                 {booking.bookingId}
//               </strong>
//             </div>

//             <div>
//               <span>Slot</span>
//               <strong>
//                 {booking.slotId}
//               </strong>
//             </div>

//             <div>
//               <span>Name</span>
//               <strong>
//                 {booking.name}
//               </strong>
//             </div>

//             <div>
//               <span>Phone</span>
//               <strong>
//                 {booking.phone}
//               </strong>
//             </div>

//             <div>
//               <span>Status</span>

//               <strong className="status-confirmed">
//                 {booking.status}
//               </strong>
//             </div>

//           </div>

//           {/* Receipt */}
//           <button
//             className="btn btn-primary btn-block"
//             style={{ marginTop: 16 }}
//             onClick={() => buildReceiptPdf(booking)}
//           >
//             Download receipt (PDF)
//           </button>

//           {/* Home */}
//           <button
//             className="btn btn-secondary btn-block"
//             style={{ marginTop: 10 }}
//             onClick={() => navigate("/")}
//           >
//             Back to Home
//           </button>

//           {/* Previous bookings */}
//           {(historyLoading || history.length > 0) && (
//             <div className="history-block">

//               <h2 className="history-heading">
//                 Your previous bookings
//               </h2>

//               {historyLoading ? (
//                 <p className="history-loading">
//                   Loading…
//                 </p>
//               ) : (
//                 <ul className="history-list">

//                   {history.map((b) => (
//                     <li
//                       key={b.bookingId}
//                       className="history-row"
//                     >
//                       <div>
//                         <strong>
//                           {b.slotId}
//                         </strong>

//                         <span className="history-id">
//                           {b.bookingId}
//                         </span>
//                       </div>

//                       <span
//                         className={`history-status status-${b.status}`}
//                       >
//                         {b.status}
//                       </span>
//                     </li>
//                   ))}

//                 </ul>
//               )}

//             </div>
//           )}

//         </div>
//       </div>
//     </div>
//   );
// }


import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import {
  getBookingHistory,
  getQrByBooking,
} from "../api/api";
import ExtensionControls from "./ExtensionControls";
import "./ConfirmationPage.css";

const HOURLY_RATE = 50;

function money(value) {
  return Number(value ?? 0).toFixed(2);
}

function displayDate(value) {
  if (!value) return "Not set";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString();
}

function getBookingAmount(booking) {
  if (booking.amount !== null && booking.amount !== undefined) {
    return Number(booking.amount);
  }

  return Number(booking.durationHours || 1) * HOURLY_RATE;
}

// Generate a receipt using the actual booking amount and duration.
function buildReceiptPdf(booking) {
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFillColor(28, 110, 74);
  doc.rect(0, 0, pageWidth, 70, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(
    "Smart Parking - Payment Receipt",
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
    doc.text(String(value ?? "-"), 40, y + 16);

    y += 34;
  };

  row("Booking ID", booking.bookingId);
  row("Slot", booking.slotId);
  row("Name", booking.name);
  row("Phone", booking.phone);
  row(
    "Status",
    String(booking.status || "confirmed").toUpperCase()
  );
  row(
    "Duration",
    `${booking.durationHours || 1} hour(s)`
  );
  row(
    "Total paid",
    `Rs. ${money(getBookingAmount(booking))}`
  );
  row(
    "Scheduled end",
    displayDate(booking.scheduledEndAt)
  );
  row("Issued", new Date().toLocaleString());

  doc.setDrawColor(225, 231, 227);
  doc.line(40, y, pageWidth - 40, y);

  doc.setFontSize(8);
  doc.setTextColor(107, 122, 114);
  doc.text(
    "Payment receipt. Refer to your payment provider for transaction details.",
    centerX,
    y + 16,
    {
      align: "center",
      maxWidth: pageWidth - 80,
    }
  );

  doc.save(`receipt-${booking.bookingId}.pdf`);
}

export default function ConfirmationPage({ booking }) {
  const navigate = useNavigate();

  const [currentBooking, setCurrentBooking] = useState(
    booking || null
  );

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [qr, setQr] = useState(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState("");

  // Keep the current booking synchronized with App state.
  useEffect(() => {
    setCurrentBooking(booking || null);
  }, [booking]);

  // Load previous bookings for the same phone number.
  useEffect(() => {
    if (!currentBooking?.phone) {
      setHistory([]);
      return;
    }

    let cancelled = false;

    setHistoryLoading(true);

    getBookingHistory(currentBooking.phone)
      .then((rows) => {
        if (!cancelled) {
          setHistory(
            (rows || []).filter(
              (item) =>
                item.bookingId !== currentBooking.bookingId
            )
          );
        }
      })
      .catch((error) => {
        console.error("Booking history error:", error);

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
  }, [currentBooking?.phone, currentBooking?.bookingId]);

  // Load the QR generated by the backend.
  useEffect(() => {
    if (!currentBooking?.bookingId) {
      setQr(null);
      setQrLoading(false);
      return;
    }

    let cancelled = false;

    setQrLoading(true);
    setQrError("");
    setQr(null);

    getQrByBooking(currentBooking.bookingId)
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
  }, [currentBooking?.bookingId]);

  // Update a previous booking after an extension payment.
  function updateHistoryBooking(updatedBooking) {
    setHistory((previous) =>
      previous.map((item) =>
        item.bookingId === updatedBooking.bookingId
          ? { ...item, ...updatedBooking }
          : item
      )
    );
  }

  if (!currentBooking) {
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

  const durationHours = Number(
    currentBooking.durationHours || 1
  );

  const totalAmount = getBookingAmount(currentBooking);

  return (
    <div className="page">
      <div className="container">
        <div className="card confirmation-card">

          {/* Existing progress indicator */}
          <div className="progress">
            <span className="progress-step active" />
            <span className="progress-step active" />
            <span className="progress-step active" />
            <span className="progress-step active" />
          </div>

          <div className="success-badge">✅</div>

          <h1 className="title">Booking Confirmed!</h1>

          <p className="subtitle">
            Show this QR code at the entrance
          </p>

          {/* Backend-generated parking QR */}
          <div className="qr-wrapper">
            {qrLoading && <p>Loading parking QR...</p>}

            {!qrLoading && qrError && (
              <>
                <p>{qrError}</p>

                <button
                  className="btn btn-secondary"
                  onClick={() => window.location.reload()}
                >
                  Refresh
                </button>
              </>
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
              <>
                <p>Parking QR is not available.</p>

                <button
                  className="btn btn-secondary"
                  onClick={() => window.location.reload()}
                >
                  Refresh
                </button>
              </>
            )}
          </div>

          {/* Existing summary plus duration-based pricing */}
          <div className="booking-summary">
            <div>
              <span>Booking ID</span>
              <strong>{currentBooking.bookingId}</strong>
            </div>

            <div>
              <span>Slot</span>
              <strong>{currentBooking.slotId}</strong>
            </div>

            <div>
              <span>Name</span>
              <strong>{currentBooking.name}</strong>
            </div>

            <div>
              <span>Phone</span>
              <strong>{currentBooking.phone}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong className="status-confirmed">
                {currentBooking.status}
              </strong>
            </div>

            <div>
              <span>Parking duration</span>
              <strong>
                {durationHours} hour(s)
              </strong>
            </div>

            <div>
              <span>Hourly rate</span>
              <strong>₹{HOURLY_RATE}/hour</strong>
            </div>

            <div>
              <span>Total paid</span>
              <strong>₹{money(totalAmount)}</strong>
            </div>

            <div>
              <span>Scheduled end time</span>
              <strong>
                {displayDate(currentBooking.scheduledEndAt)}
              </strong>
            </div>
          </div>

          {/* New feature: extend an existing confirmed booking */}
          <ExtensionControls
            booking={currentBooking}
            onUpdated={(updatedBooking) => {
              setCurrentBooking((previous) => ({
                ...previous,
                ...updatedBooking,
              }));

              updateHistoryBooking(updatedBooking);
            }}
          />

          {/* Existing receipt download */}
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 16 }}
            onClick={() => buildReceiptPdf(currentBooking)}
          >
            Download receipt (PDF)
          </button>

          {/* Existing home navigation */}
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
                <p className="history-loading">Loading…</p>
              ) : (
                <ul className="history-list">
                  {history.map((item) => (
                    <li
                      key={item.bookingId}
                      className="history-row"
                    >
                      <div>
                        <strong>{item.slotId}</strong>

                        <span className="history-id">
                          {item.bookingId}
                        </span>

                        <span className="history-id">
                          {item.durationHours || 1} hour(s)
                          {" · "}₹
                          {money(getBookingAmount(item))}
                        </span>

                        <span className="history-id">
                          Ends: {displayDate(item.scheduledEndAt)}
                        </span>

                        <ExtensionControls
                          booking={item}
                          onUpdated={updateHistoryBooking}
                        />
                      </div>

                      <span
                        className={`history-status status-${String(
                          item.status || ""
                        ).toLowerCase()}`}
                      >
                        {item.status}
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
