import React, { useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import SlotSelection from "./components/SlotSelection";
import BookingForm from "./components/BookingForm";
import PaymentPage from "./components/PaymentPage";
import ConfirmationPage from "./components/ConfirmationPage";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";

/**
 * Booking flow:
 *   Home -> Select Slot -> Booking Form -> Payment -> Confirmation
 *
 * The in-progress booking is kept here (in App) and passed down as props,
 * since every step after slot selection needs it.
 */
export default function App() {
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [booking, setBooking] = useState(null); // { bookingId, slotId, name, phone, status, createdAt }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/slots"
          element={
            <SlotSelection
              selectedSlotId={selectedSlotId}
              setSelectedSlotId={setSelectedSlotId}
            />
          }
        />
        <Route
          path="/book"
          element={
            <BookingForm
              selectedSlotId={selectedSlotId}
              booking={booking}
              setBooking={setBooking}
            />
          }
        />
        <Route
          path="/pay"
          element={
            <PaymentPage
              booking={booking}
              setBooking={setBooking}
              setSelectedSlotId={setSelectedSlotId}
            />
          }
        />
        <Route
          path="/confirmation"
          element={<ConfirmationPage booking={booking} />}
        />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </HashRouter>
  );
}