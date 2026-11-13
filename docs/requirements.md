# Cinema RIO (FilmHall) — Requirements Engineering Document

## 1. Project Overview

- **Project name**: FilmHall — **Cinema RIO (Oulu • Tampere)**
- **Technology stack**: React (Vite), Node.js, Express, PostgreSQL, Stripe Test Checkout.
- **Locations & Auditoriums**:
  1. **Cinema RIO Oulu** — *Kauppurienkatu 45, 90100 Oulu, Finland* (`+358 8 5542 3890`)
     - Auditorium 1: **100 seats** (10 rows × 10 seats)
     - Auditorium 2: **200 seats** (20 rows × 10 seats)
  2. **Cinema RIO Tampere** — *Hämeenkatu 27, 33100 Tampere, Finland* (`+358 2 2641 7520`)
     - Auditorium 1: **100 seats** (10 rows × 10 seats)
     - Auditorium 2: **200 seats** (20 rows × 10 seats)
- **Visual Theme**: Gold, Black, and Red (`Cinematic RIO Marquee Logo.png`).
- **Main user roles (3 Roles)**:
  1. **Customer** (Guest or Registered Account)
  2. **Theater Staff (Cashier)**
  3. **Theater Administrator (Owner)**

## 2. Functional Requirements

### Customer & Booking Features
- **FR1 — Browse & Filter Movies**: The system shall display available movies with titles, posters, release years, genres, durations, and age ratings, with filtering by location (**Oulu** / **Tampere**), genre, and title search.
- **FR2 — External Movie API Resilience**: The system shall support movie metadata from an open movie API while maintaining local database/fallback persistence so customers can continue buying tickets even if the external API is unavailable.
- **FR3 — Showtime Timeline Display**: For every screening, the system shall display the auditorium door opening time (**15 minutes before advertisements**), the **12-minute advertisement slot**, and the feature film start time.
- **FR4 — Cinema RIO Auditorium Seat Map**:
  - The seat map shall number rows starting from the front screen, **skipping Row 13** (Row 12 is followed directly by Row 14).
  - Seats shall be arranged 10 per row using **snake numbering** from the screen, **skipping Seat #13**.
  - **Row 1** shall include designated, limited **wheelchair-accessible (♿)** seats.
  - The seat map shall visually indicate the **Silver Screen at the front** and **dual rear entrances on both left and right sides**.
- **FR5 — Guided Seat Selection & No 1-Seat Gap Rule**:
  - The system shall provide a guided **"Suggest Best Seats"** helper for customers.
  - The system shall detect if a customer's selection leaves a **1-seat empty gap** between selected or occupied seats in the same row, alert the customer, and offer an automatic seat adjustment.
- **FR6 — Temporary Seat Hold (10–15 Minutes)**: Selected seats shall be held for **15 minutes** during checkout; concurrent attempts to book the same seat shall allow only one customer to succeed (`HTTP 409 Conflict`).
- **FR7 — Pricing & Discounts**:
  - Standard cinema tier includes the **+15%** base adjustment.
  - **Child Discount**: Customers aged **12 or under** receive **50% off**.
  - **Member Loyalty Bundle**: Registered customer accounts receive **50% off** when booking **10 tickets**.
- **FR8 — Two Checkout Paths (Online Payment vs. Counter Reservation)**:
  - **Path A — Pay Online Immediately (Stripe / Direct)**: Available to **Guests and Registered Customers** without requiring login. No ticket count limit. Once paid, **tickets cannot be cancelled**.
  - **Path B — Reserve & Pay at Theater Counter**: Requires a **Registered Customer Account**. Limited to a **maximum of 6 tickets** (for larger unpaid group bookings, customers must call the theater). Uncollected reservations are **automatically cancelled 2 hours before the movie starts**.
- **FR9 — Booking Retrieval & Entrance Verification**: Confirmed bookings receive a unique reference (`FH-...`) that customers can retrieve with their email and present for staff verification at the entrance.
- **FR10 — B2B Corporate Private Showtimes**: The system shall provide a Business-to-Business (B2B) booking form allowing companies to request private screenings in Oulu or Tampere (100-seat or 200-seat hall).

### Staff (Cashier) & Admin (Owner) Features
- **FR11 — Role-Based Authentication**: Authorized staff and owners shall sign in securely; server-side middleware enforces authentication (`401`) and role authorization (`403`).
- **FR12 — Entrance Ticket Checker & Cancellation Alerts**: Staff shall verify booking references at the entrance and receive alerts when unpaid reservations are cancelled and seats are released.
- **FR13 — Catalog, Screening & Business Management**: Owners shall manage movies (including Open API import), auditorium screenings, and view cinema-wide revenue and ticket sales reports.

## 3. Non-Functional Requirements

- **NFR1 — Performance**: Movie listings shall load within 3 seconds for at least 95% of requests under a load of 100 concurrent users.
- **NFR2 — Security & Trust Boundary**: All price calculations, seat availability checks, and role permissions must be enforced on the Express server ("The UI guides. The server decides.").
- **NFR3 — Usability**: At least 90% of first-time test users shall be able to find a movie, select a screening, use the guided seat map, and reach the checkout review within 3 minutes.
- **NFR4 — Compatibility**: Supports the latest two stable versions of Chrome, Edge, Firefox, and Safari on desktop and mobile viewports.
- **NFR5 — Booking Integrity**: Database transactions (`FOR UPDATE`) prevent double-booking the same seat for the same screening.

## 4. Confirmed Client Decisions (From Customer Interview)

| Question | Confirmed Client Rule |
| --- | --- |
| **Q1: Customer Accounts** | Optional for online payment (Guest checkout allowed). **Required** to reserve seats and pay later at the theater counter, and required for the 10-ticket 50% loyalty discount. |
| **Q2: Payments** | Both **Online Payment** (Stripe test mode) and **Pay at Theater Counter** (registered users, max 6 tickets, pickup ≥2h before start) are supported. |
| **Q3: Theater Locations** | **Two locations**: **Cinema RIO Oulu** and **Cinema RIO Tampere**, each with **100-seat** and **200-seat** auditoriums. |
| **Q4: Cancellations** | Unpaid reservations can be cancelled before payment (and auto-cancel 2h before showtime). **After a ticket is paid, no cancellation is allowed.** |
| **Q5: Scope Exclusions** | **No food or snacks** are sold on the website. |
