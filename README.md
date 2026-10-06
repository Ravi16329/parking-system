# 🅿️ Smart Parking System — Apartment Edition

A web application that lets residents/visitors of an apartment building **book a parking slot online** — view live slot availability, reserve a free slot, get a QR code, and pay — all using dummy/mock data for demo purposes (no real backend, database, or payment gateway required).

> This project is a scaled-down, apartment-specific version of a generic city-wide parking system. It focuses on **one apartment with a fixed number of dummy parking slots**, not multi-location search.

---
// addedd cI/CD 

// checking in lab ci/cd
## 📌 Project Overview

| | |
|---|---|
| **Type** | Web Application (Frontend-focused demo) |
| **Scope** | Single apartment building, dummy parking slots |
| **Data** | Dummy/mock data (JSON) — no real database needed |
| **Payment** | Simulated/dummy payment (no real gateway) |
| **Goal** | Demonstrate a complete parking-booking flow end-to-end |

---

## ✨ Features

- 🏢 **Apartment Landing Page** — displays the dummy apartment (name, address, image, total slots)
- 🅿️ **Live Slot Availability** — grid view of all parking slots, color-coded by status
- 🔒 **Slot Locking** — once a user selects a slot, it's instantly marked *Held* so no one else can book it simultaneously
- 📝 **Booking Form** — collects Name and Phone Number
- 🔳 **QR Code Generation** — auto-generates a unique QR code containing the booking details
- 💳 **Dummy Payment Flow** — simulated payment step before final confirmation
- ✅ **Booking Confirmation** — final screen showing the QR code + booking summary

---

## 🔄 Working Flow (Step-by-Step)

```
1. HOME PAGE
   → Displays the apartment (name, address, photo, total slots)
   → "Book Parking" button

2. SLOT SELECTION PAGE
   → Shows all dummy slots in a grid (e.g. A1–A20)
   → Color coding:
        🟩 Green  = Available
        🟨 Yellow = Held (someone else is currently booking it)
        🟥 Red    = Occupied
   → User clicks a GREEN (available) slot

3. SLOT LOCKED
   → Selected slot instantly turns YELLOW for all other users
   → Prevents double-booking of the same slot
   → (Optional) auto-releases back to Available if not confirmed in X minutes

4. BOOKING FORM
   → User enters: Name, Phone Number
   → Clicks "Confirm Booking"

5. QR CODE GENERATED
   → System generates a unique Booking ID
   → QR code created, encoding: Booking ID + Slot Number + Name

6. PAYMENT PAGE (Dummy)
   → Mock payment options (UPI / Card) — simulated success, no real transaction

7. CONFIRMATION PAGE
   → Shows QR code + full booking summary
   → Slot status permanently updates to OCCUPIED
```

**Flow diagram:**
```
Home Page → Select Slot → Slot Held → Enter Details → Generate QR → Dummy Payment → Confirmation
```

---

## 🧩 Page-by-Page Breakdown

| Page | Purpose |
|---|---|
| `HomePage` | Displays apartment details, entry point to booking |
| `SlotSelection` | Grid of slots, real-time status, click-to-select |
| `BookingForm` | Collects user Name & Phone Number |
| `PaymentPage` | Dummy payment simulation |
| `ConfirmationPage` | Displays QR code + booking summary |

---

## 🗂️ Dummy Data Structure

**`apartment.json`**
```json
{
  "name": "Green Meadows Apartments",
  "address": "12 Lakeview Road, Vijayawada",
  "totalSlots": 20,
  "image": "apartment.jpg"
}
```

**`slots.json`**
```json
[
  { "id": "A1", "status": "available" },
  { "id": "A2", "status": "occupied" },
  { "id": "A3", "status": "available" }
]
```

**Booking object (created after form submission)**
```json
{
  "bookingId": "BK1023",
  "slotId": "A3",
  "name": "Rahul Sharma",
  "phone": "9876543210",
  "status": "held",
  "createdAt": "2026-08-10T10:15:00"
}
```

---

## 🛠️ Tech Stack

- **Frontend:** React.js (JSX components, React state for slot/booking logic)
- **Styling:** CSS / Tailwind CSS
- **QR Code:** `qrcode.react` npm package
- **Data:** Local dummy JSON — no external database
- **Version Control:** GitHub

*(No backend/microservices, no MySQL, no real payment gateway — everything is simulated on the frontend for this version.)*

---

## 📁 Suggested Folder Structure

```
smart-parking-apartment/
├── public/
│   └── apartment.jpg
├── src/
│   ├── data/
│   │   ├── apartment.json
│   │   └── slots.json
│   ├── components/
│   │   ├── HomePage.jsx
│   │   ├── SlotSelection.jsx
│   │   ├── BookingForm.jsx
│   │   ├── PaymentPage.jsx
│   │   └── ConfirmationPage.jsx
│   ├── App.jsx
│   └── index.js
├── package.json
└── README.md
```

---

## 🚧 Not Included in This Version (Stretch Goals)

- User login/signup & authentication
- Admin dashboard (manage slots, view revenue reports)
- Real payment gateway integration
- Real database / backend server
- Email/SMS notifications
- Multi-apartment / multi-location search

These can be added later as enhancements once the core booking flow is working.

---

## 🚀 Getting Started

```bash
# clone the repo
git clone <your-repo-url>
cd smart-parking-apartment

# install dependencies
npm install

# run the app
npm start
```

---

## 📄 License

This project is for academic/learning purposes.
