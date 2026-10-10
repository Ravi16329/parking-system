<div align="center">

# 🅿️ Smart Parking System — Apartment Edition

### Pick a bay in a 3D garage · Verify your phone · Pay online · Scan the QR at the gate

<br/>

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-3D_Garage-000000?style=for-the-badge&logo=three.js&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![Java](https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Razorpay](https://img.shields.io/badge/Razorpay-Payments-0C2451?style=for-the-badge&logo=razorpay&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Render-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Jenkins](https://img.shields.io/badge/Jenkins-CI%2FCD-D24939?style=for-the-badge&logo=jenkins&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Frontend-222222?style=for-the-badge&logo=github&logoColor=white)

<br/>

**A full-stack apartment parking reservation system.**
Residents pick a bay in an interactive 3D garage, verify their phone, pay online with Razorpay, and get a QR code that is scanned at the gate on the way in and out.
An admin panel lets staff book walk-in visitors, free up stuck bays, and post notices.

<br/>

[✨ Features](#-features) •
[🧰 Tech Stack](#-1-tech-stack) •
[🏗️ Architecture](#️-2-high-level-architecture) •
[🗄️ Database](#️-4-database-schema) •
[🔄 Core Flows](#-6-core-flows) •
[⚠️ Limitations](#️-7-known-gaps--honest-limitations) •
[🚀 Run Locally](#-9-running-it-locally)

</div>

---

> [!NOTE]
> This README explains the stack, the architecture, what every file does, how data moves through the system, and how to run it locally — written so it can be presented as-is for a course review/demo.

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| 🏢 | **Interactive 3D garage** | Three.js garage with 4 floors × 100 bays, live-updating every 3 seconds |
| ⏱️ | **3-minute slot hold** | Bay is reserved for you while you fill the form and pay; auto-released on expiry |
| 📱 | **Phone verification** | 6-digit OTP step in the booking form (currently simulated — see [§7](#️-7-known-gaps--honest-limitations)) |
| 💳 | **Online payments** | Razorpay order creation + server-side signature verification |
| 🔳 | **QR entry & exit** | Backend-generated QR scanned at the gate with a camera-based scanner |
| 🧾 | **PDF receipt** | Generated fully client-side with jsPDF |
| 🛡️ | **Admin panel** | Walk-in bookings, release stuck bays, post announcements, scan QR codes |
| 📢 | **Announcements** | Latest admin notice shown as a banner on the home page |
| 🔁 | **Dual hold expiry** | Lazy release on requests **plus** a background sweeper every 20s |

---

## 🧰 1. Tech stack

| Layer | Technology |
|---|---|
| 🎨 **Frontend** | React 18 (Create React App), React Router (`HashRouter`) |
| 🧊 **3D garage view** | Three.js (raw, not react-three-fiber) + `OrbitControls` |
| 📦 **Frontend libraries** | `qrcode.react` (render QR), `html5-qrcode` (camera scanning), `jsPDF` (receipt PDF) |
| ⚙️ **Backend** | Java 17, Spring Boot 3.3 (Web, Validation, Data JPA, Scheduling) |
| 🗄️ **Database** | PostgreSQL (production, hosted on Render) |
| 💰 **Payments** | Razorpay (`razorpay-java` SDK) — order creation + signature verification |
| 🔐 **Auth** | Custom lightweight admin auth (fixed password + in-memory token), **not** Spring Security |
| ☁️ **Hosting** | Backend: Render (Docker). Frontend: GitHub Pages (`gh-pages`) |
| 🔧 **CI/CD** | Jenkins pipeline (`Jenkinsfile`) — builds both apps, deploys frontend to GitHub Pages |

---

## 🏗️ 2. High-level architecture

```mermaid
graph TD
    subgraph Browser
        A["React SPA<br/>HashRouter"]
    end

    subgraph Render_Backend["Backend (Render, Docker)"]
        B["Spring Boot REST API<br/>/api/**"]
        C[(PostgreSQL)]
        D["SlotHoldSweeper<br/>background job, every 20s"]
    end

    subgraph External
        E["Razorpay<br/>Checkout + Orders API"]
    end

    A -- "fetch() JSON" --> B
    B -- "Spring Data JPA" --> C
    D -- "releases expired holds" --> C
    A -- "loads checkout.js,<br/>opens payment widget" --> E
    B -- "create order /<br/>verify signature" --> E
```

> [!IMPORTANT]
> The frontend never talks to Razorpay's secret key directly — it only opens the Razorpay widget with an **order id** the backend created, then hands the resulting payment id/signature back to the backend, which is the only place that verifies them (see [§6.1](#61-online-booking-payment-and-qr-issuance)).

---

## 📁 3. Repository structure

```
smart-parking-apartment/
├── Jenkinsfile                     # CI/CD: build both apps, deploy frontend to GitHub Pages
├── backend/
│   ├── Dockerfile                  # multi-stage build -> runs the Spring Boot jar
│   ├── pom.xml                     # Maven deps: web, data-jpa, validation, postgresql, razorpay-java
│   └── src/main/
│       ├── resources/
│       │   ├── application.properties
│       │   └── data.sql            # seeds 1 apartment + 400 slots (4 floors x 100)
│       └── java/com/smartparking/apartment/
│           ├── entity/             # JPA entities (DB tables)
│           ├── repository/         # Spring Data interfaces
│           ├── service/ + impl/    # business logic
│           ├── controller/         # REST endpoints
│           ├── dto/                # request/response shapes
│           ├── security/           # admin auth (password + token), no Spring Security
│           ├── config/             # CORS, Razorpay client bean
│           ├── scheduler/          # background hold-expiry sweep
│           └── exception/          # SlotUnavailableException
└── frontend/
    ├── package.json                # homepage set for GitHub Pages deploy
    └── src/
        ├── App.jsx                 # all routes + the state shared across the booking flow
        ├── api/api.js              # every backend call lives here — the only file that knows the API shape
        └── components/             # one file per page/widget (listed in §5)
```

---

## 🗄️ 4. Database schema

```mermaid
erDiagram
    APARTMENT {
        bigint id PK
        string name
        string address
        int total_slots
        string image
    }
    SLOT {
        string id PK "e.g. A1, B37, D100"
        string status "AVAILABLE | HELD | OCCUPIED"
        int floor "1-4"
        datetime heldAt "null unless HELD"
    }
    BOOKING {
        string bookingId PK "e.g. BK1A2B3C4"
        string slotId FK
        string name
        string phone
        string status "HELD | PAID | CONFIRMED | CANCELLED"
        datetime createdAt
    }
    PAYMENT {
        string paymentId PK "UUID"
        string bookingId FK
        decimal amount
        string paymentMode "RAZORPAY"
        string status "CREATED | SUCCESS | FAILED"
        string transactionId "razorpay_payment_id"
        string razorpayOrderId
        datetime paymentTime
    }
    PARKING_QR {
        string qrId PK "UUID"
        string token UK "the value actually encoded in the QR image"
        string bookingId UK FK
        string status "ACTIVE | PARKED | USED | EXPIRED"
        datetime generatedAt
        datetime entryAt
        datetime exitAt
    }
    ANNOUNCEMENT {
        bigint id PK
        string message
        datetime createdAt
    }

    BOOKING ||--o{ PAYMENT : "has"
    BOOKING ||--|| PARKING_QR : "has one (after payment)"
    SLOT ||--o{ BOOKING : "referenced by (slotId, not a real FK constraint)"
```

**📝 Notes**

- `SLOT.id` is also the display label (`A1`…`D100`) — there's no separate numeric primary key. `data.sql` seeds 100 slots per floor, all `AVAILABLE`:

  | Floor | Slot IDs |
  |:---:|:---:|
  | 1 | `A1` – `A100` |
  | 2 | `B1` – `B100` |
  | 3 | `C1` – `C100` |
  | 4 | `D1` – `D100` |

- `BOOKING.slotId` and `PAYMENT.bookingId` / `PARKING_QR.bookingId` are plain string columns, not JPA `@ManyToOne` relations — the services look rows up by id manually. Simple, but means there's no DB-level referential integrity between them.
- `SLOT.heldAt` is how a hold's 3-minute expiry is calculated: see [§6.4](#64-hold-expiry-the-3-minute-timer).

---

## 🖥️ 5. Frontend — every file and what it's for

| File | Role |
|---|---|
| `App.jsx` | Declares all routes and owns the three pieces of state shared across the booking flow: `selectedSlotId`, `booking`, `holdExpiresAt`. Passes them down as props — there's no Redux/Context, just prop drilling, which is fine at this size. |
| `api/api.js` | **The only file that calls `fetch()`.** Every component imports functions from here instead of building URLs itself. Also normalizes backend responses (e.g. lowercases `status` enums) so the rest of the app doesn't deal with Java-style `"AVAILABLE"` vs `"available"`. |
| `components/HomePage.jsx` | Landing page (video hero). Loads apartment info + a live free-slot count, and shows the latest admin announcement as a small banner. |
| `components/SlotSelection.jsx` | The Three.js 3D garage. Renders a 10×10 grid per floor, positioned by **parsing each slot's own number out of its id** (not array index — see the comment in the file; this was a real bug once, documented in the code). Clicking an available bay calls `holdSlot()`, starts the countdown, and polls `getSlots()` every 3s so other users' changes show up live. |
| `components/HoldCountdown.jsx` | Small reusable "Hold expires in mm:ss" chip, used on this page, `BookingForm`, and `PaymentPage`. Styled for dark backgrounds since all three usages sit on dark panels. |
| `components/BookingForm.jsx` | Two-step form: enter name/phone, then a 6-digit OTP. **The OTP is currently simulated client-side** (see [§7](#️-7-known-gaps--honest-limitations)) — no real SMS is sent. On success, calls `createBooking()` (persists a `HELD` booking row) and moves to `/pay`. |
| `components/PaymentPage.jsx` | Opens Razorpay's checkout widget via `createPaymentOrder()` → `window.Razorpay(...).open()` → `verifyPayment()`. Shows the live hold countdown; if it expires before payment, shows a takeover screen instead of silently failing later. |
| `components/ConfirmationPage.jsx` | Fetches the backend-generated QR (`getQrByBooking`) and renders it with `qrcode.react`, offers a PDF receipt download (`jsPDF`, fully client-side), and shows the phone number's other past bookings. |
| `components/AdminLogin.jsx` | Single password field → `adminLogin()` → stores the returned token in `sessionStorage`. |
| `components/AdminDashboard.jsx` | Three panels: walk-in booking form (`adminBookSlot`), a list of every held/occupied bay with a Release button (`adminReleaseSlot`), and the announcement composer/list. Also links to the two scanner pages. |
| `components/QrScanner.jsx` | Camera-based QR reader (`html5-qrcode`) used for **both** entry and exit — which mode it's in comes from a prop set by the route (`/admin/check-qr` vs `/admin/exit-check-qr`), so it's one component doing two jobs. Requires the admin token in `sessionStorage` (redirects to login otherwise). |

### 🧭 Routes (`App.jsx`)

| Path | Component | Who |
|---|---|---|
| `/` | `HomePage` | 🌍 Everyone |
| `/slots` | `SlotSelection` | 🌍 Everyone |
| `/book` | `BookingForm` | 🌍 Everyone |
| `/pay` | `PaymentPage` | 🌍 Everyone |
| `/confirmation` | `ConfirmationPage` | 🌍 Everyone |
| `/admin` | `AdminLogin` | 🔐 Admin |
| `/admin/dashboard` | `AdminDashboard` | 🔐 Admin (token required) |
| `/admin/check-qr` | `QrScanner` (entry mode) | 🔐 Admin (token required) |
| `/admin/exit-check-qr` | `QrScanner` (exit mode) | 🔐 Admin (token required) |

---

## 🔄 6. Core flows

### 6.1 Online booking, payment, and QR issuance

```mermaid
sequenceDiagram
    actor U as Resident
    participant FE as React App
    participant BE as Spring Boot API
    participant RP as Razorpay

    U->>FE: Click a green bay (SlotSelection)
    FE->>BE: POST /api/slots/{id}/hold
    BE-->>FE: slot now HELD, heldAt set
    FE->>FE: start 3-min countdown (client clock)

    U->>FE: Fill name + phone, verify OTP (simulated)
    FE->>BE: POST /api/bookings {slotId, name, phone}
    BE-->>FE: booking (status HELD)

    FE->>BE: POST /api/payments/create-order {bookingId}
    BE->>RP: create order (₹50)
    RP-->>BE: razorpayOrderId
    BE->>BE: save Payment row (status CREATED)
    BE-->>FE: {orderId, keyId, amount}

    FE->>RP: open Razorpay checkout widget
    U->>RP: pays
    RP-->>FE: razorpay_payment_id, razorpay_signature

    FE->>BE: POST /api/payments/verify {bookingId, razorpay*}
    BE->>BE: look up Payment by orderId, verify signature
    BE->>BE: Payment -> SUCCESS, Booking -> CONFIRMED
    BE->>BE: Slot -> OCCUPIED
    BE->>BE: generate ParkingQr (status ACTIVE)
    BE-->>FE: confirmed booking

    FE->>BE: GET /api/qr/booking/{bookingId}
    BE-->>FE: {token, status}
    FE-->>U: show QR code (ConfirmationPage)
```

### 6.2 Gate entry/exit (QR scan)

```mermaid
sequenceDiagram
    actor R as Resident (shows QR)
    actor S as Security guard (admin device)
    participant FE as QrScanner page
    participant BE as Spring Boot API

    Note over S,FE: /admin/check-qr — entry
    S->>FE: scans QR with camera
    FE->>BE: POST /api/qr/entry?token=... (X-Admin-Token)
    BE->>BE: ParkingQr: ACTIVE -> PARKED, entryAt set
    BE-->>FE: ok

    Note over S,FE: /admin/exit-check-qr — exit
    S->>FE: scans QR again on the way out
    FE->>BE: POST /api/qr/exit?token=... (X-Admin-Token)
    BE->>BE: ParkingQr: PARKED -> USED, exitAt set
    BE->>BE: Slot -> AVAILABLE (releaseOccupiedSlot)
    BE-->>FE: ok
```

> [!NOTE]
> A QR scanned out of order (e.g. exit before entry, or scanned twice) is rejected with a `400` — `QrServiceImpl` checks the current status before each transition.

### 6.3 Admin walk-in booking (no online flow)

```mermaid
sequenceDiagram
    actor D as Walk-in driver
    actor A as Admin
    participant FE as AdminDashboard
    participant BE as Spring Boot API

    D->>A: pays cash, gives name + phone
    A->>FE: pick a free slot, enter name + phone
    FE->>BE: POST /api/admin/slots/{id}/book {name, phone}
    BE->>BE: atomically claim the slot (same tryHold as the online flow)
    BE->>BE: Slot -> OCCUPIED directly (skips HELD)
    BE->>BE: Booking saved as CONFIRMED
    BE-->>FE: booking
```

This reuses the exact same atomic `tryHold` query the online flow uses, so an admin can't accidentally grab a bay a resident is mid-booking on.

> [!WARNING]
> This path does **not** call `qrService.generateQr()` — walk-in bookings don't currently get a QR code, so the exit-scan flow only applies to bookings made through the online payment flow.

### 6.4 Hold expiry (the 3-minute timer)

A held slot is freed back to `AVAILABLE` by **two independent mechanisms**, both driven by `app.slot.hold-minutes` (`3`):

1. **Lazy release** — every time `getAllSlots()` or `holdSlot()` runs, it first runs `releaseExpiredHolds(...)`, an `UPDATE` that flips any slot `HELD` longer than the cutoff back to `AVAILABLE`. Cheap, but only fires when someone happens to make a request.
2. **`SlotHoldSweeper`** — a `@Scheduled(fixedRate = 20_000)` job that runs the same release query every 20 seconds regardless of traffic, so a bay doesn't stay stuck held forever if nobody's tab is open.

On the frontend, `HoldCountdown` is a purely visual, client-side timer (`Date.now() + HOLD_MINUTES * 60000`) — it doesn't control real expiry, it just estimates it so the UI can warn the user and reroute them before the backend actually drops their hold.

> [!TIP]
> It deliberately does **not** parse the server's `heldAt` timestamp — see the comment in `SlotSelection.jsx`: Java's `LocalDateTime` serializes with no timezone marker, which `Date.parse` silently misreads as local time, so using the browser's own clock as the reference point avoids a timezone bug entirely.

### 6.5 Admin authentication

```mermaid
sequenceDiagram
    actor A as Admin
    participant FE as React App
    participant BE as Spring Boot API

    A->>FE: enters password (AdminLogin)
    FE->>BE: POST /api/admin/login {password}
    BE->>BE: compare to app.admin.password
    BE-->>FE: {token} (random UUID, kept in-memory, 4h TTL)
    FE->>FE: sessionStorage.setItem('adminToken', token)

    A->>FE: any admin action (release/book/post/scan)
    FE->>BE: request with header X-Admin-Token
    BE->>BE: AdminAuthFilter checks token validity
    BE-->>FE: 200, or 401 if missing/expired
    FE->>FE: 401 -> clear token, redirect to /admin
```

This is a deliberately simple scheme (see `security/AdminAuthService.java`'s own doc comment):

- 🔑 One shared password, no per-admin accounts
- 🧠 Tokens live only in server memory (lost on restart), with a 4-hour TTL
- 🧱 `AdminAuthFilter` is a plain `OncePerRequestFilter` registered only for `/api/admin/**` — **not** Spring Security
- ✈️ It explicitly lets `OPTIONS` requests through unchecked, because a browser's CORS preflight for a request carrying `X-Admin-Token` never includes that header itself; blocking it would make every admin POST/DELETE fail as a CORS error before the real request is even sent
- 🚪 **The one exception:** the QR entry/exit endpoints (`/api/qr/entry`, `/api/qr/exit`) sit under `/api/qr/**`, outside the filter's path, so `QrController` checks `adminAuthService.isValid(...)` manually instead

---

## ⚠️ 7. Known gaps / honest limitations

Worth knowing before a professor asks about them:

| # | Gap | Details |
|:---:|---|---|
| 1 | 📵 **OTP is simulated, not real SMS** | `BookingForm.jsx` calls `sendOtp()` / `verifyOtp()` in `api.js`, which generate and check a code entirely in the browser with a fake delay — no request reaches the backend. The backend *does* have a working `OtpController` (`POST /api/otp/send` / `/verify`) with matching logic already written in `api.js` and commented out — wiring up a real SMS provider (Twilio/MSG91) is a drop-in swap, not a redesign. |
| 2 | 💸 **Two payment paths exist** | `POST /api/payments` (`processDummyPayment`) is the original always-succeeds stub from before Razorpay was integrated. It's left in place but `PaymentPage.jsx` no longer calls it — the live path is `createPaymentOrder` + `verifyPayment` against Razorpay. |
| 3 | 🏢 **`GET /api/apartment` is an unused stub** | `ApartmentController` and `ApartmentServiceImpl.getApartmentDetails()` both return `null`. `HomePage.jsx` actually gets apartment info by importing a local `apartment.json` and merging in a live slot count — this endpoint was never wired up on the frontend side. |
| 4 | 🚶 **Walk-in bookings skip QR issuance** | See [§6.3](#63-admin-walk-in-booking-no-online-flow) — only online, Razorpay-paid bookings get a scannable QR right now. |
| 5 | 🔗 **No DB foreign keys** | Between `Booking.slotId` / `Payment.bookingId` / `ParkingQr.bookingId` and their parent rows — they're plain strings looked up manually in each service, not JPA relations. |

---

## 🚢 8. Deployment & CI/CD

| Part | How it's deployed |
|---|---|
| 🐳 **Backend** | Containerized with `backend/Dockerfile` (multi-stage: builds with Maven, runs on a slim JRE), deployed to **Render**, backed by a managed **PostgreSQL** instance (connection string in `application.properties`, overridden by Render's environment in production). |
| 🌐 **Frontend** | Built with `npm run build` and pushed to the `gh-pages` branch via the `gh-pages` npm package, served by **GitHub Pages** at the `homepage` set in `package.json`. |
| 🔧 **CI/CD** | A single `Jenkinsfile` at the repo root: checks out the repo, builds the frontend (`npm install && npm run build`) and backend (`mvn clean package -DskipTests`), then deploys the frontend build to GitHub Pages using a stored GitHub PAT. |
| 🛰️ **Backend deploy trigger** | The backend doesn't have an explicit deploy stage in the pipeline — Render deploys are presumably triggered separately (e.g. on push, via Render's own GitHub integration). |
| 🔒 **CORS** | `CorsConfig.java` allows exactly `http://localhost:3000` (local dev) and `https://ravi16329.github.io` (the deployed frontend). |

```mermaid
flowchart LR
    DEV[👨‍💻 Push to GitHub] --> J[🔧 Jenkins Pipeline]
    J --> FB["📦 Build frontend<br/>npm install && npm run build"]
    J --> BB["📦 Build backend<br/>mvn clean package -DskipTests"]
    FB --> GP[🌐 GitHub Pages<br/>gh-pages branch]
    DEV -. "Render GitHub integration (presumed)" .-> R[🐳 Render<br/>Docker + PostgreSQL]
```

---

## 🚀 9. Running it locally

### 📋 Prerequisites

- ☕ Java 17 + Maven
- 🟢 Node.js + npm
- 🐘 A PostgreSQL instance
- 💳 A Razorpay **test-mode** key pair

### ⚙️ Backend

```bash
cd backend
# needs a Postgres instance — set its URL/credentials in
# src/main/resources/application.properties (or override via env vars),
# and set razorpay.key.id / razorpay.key.secret to a Razorpay test-mode key pair.
mvn spring-boot:run
```

### 🎨 Frontend

```bash
cd frontend
npm install
npm start
```

> [!TIP]
> By default the frontend's `api.js` points `BASE_URL` at the deployed Render backend — change it to `http://localhost:8080/api` to run fully locally against your own backend instance.

---

<div align="center">

### 🅿️ Smart Parking System — Apartment Edition

Built with ❤️ using React, Three.js, Spring Boot, PostgreSQL & Razorpay

⭐ If you found this project useful, consider giving it a star!

</div>
