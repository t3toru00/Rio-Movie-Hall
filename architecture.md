# Cinema RIO (FilmHall) — System Architecture & Database ERD

## 1. Architecture Overview
**Cinema RIO (FilmHall)** follows a three-tier layered web architecture connecting a **React + Vite** Single Page Application (`client/`), a **Node.js + Express** REST API (`server/`), and a **PostgreSQL** relational database (`database/`), with external integrations for **Stripe Hosted Checkout** (online ticket payments) and an **Open Movie API** (with local database fallback so ticket sales never stop if the external API is unreachable).

### System Architecture Diagram

```mermaid
flowchart LR
  subgraph Client["Browser Client (React 19 + Vite — Port 5173)"]
    UI["Customer UI\n• Oulu & Tampere Catalog\n• Snake Seat Map (No Row 13)\n• 1-Seat Gap Alert & 15m Timer"]
    B2B["Corporate B2B UI\n• Private Showtimes (100/200 seats)"]
    StaffUI["Cashier & Owner Portal\n• Entrance Ticket Checker\n• Movies, Screenings & KPIs"]
  end

  subgraph Server["Backend API (Node.js + Express — Port 3000)"]
    Routes["REST Routes (/api/*)"]
    AuthMW["Auth & Role Middleware\n• Session Cookie / JWT\n• 401 vs 403 Enforcement"]
    Controllers["Controllers & Services\n• Server-Side Price & Discount Calc\n• Seat Conflict Check (409)"]
    Webhook["Stripe Webhook Handler\n• /api/stripe/webhook (express.raw)"]
  end

  subgraph Data["Persistence & External Services"]
    PG[("PostgreSQL Database\n• Transactional Seat Locks\n• Oulu & Tampere Data")]
    Stripe["Stripe Sandbox Checkout\n• Hosted Payment Page\n• Signed Webhooks"]
    MovieAPI["Open Movie API\n• Metadata Import\n• Resilient DB Fallback"]
  end

  UI -->|"HTTPS / Fetch JSON"| Routes
  B2B -->|"HTTPS / Fetch JSON"| Routes
  StaffUI -->|"Credentials / Auth"| AuthMW
  Routes --> AuthMW --> Controllers
  Controllers -->|"SQL Transactions (FOR UPDATE)"| PG
  Controllers -->|"Create Checkout Session"| Stripe
  Stripe -->|"checkout.session.completed"| Webhook
  Webhook -->|"Mark Booking Paid"| PG
  Controllers -->|"Fetch & Cache Metadata"| MovieAPI
```

---

## 2. Trust Boundary & Security Principles
Following the course Authentication, Authorization, and Stripe Payment guidelines:
1. **"The UI guides. The server decides."**
   - Conditional rendering in React improves usability for Customers, Cashiers, and Owners, but every protected route in `server/` independently enforces authentication (`401 Unauthorized`) and role authorization (`403 Forbidden`).
2. **Server-Side Pricing & Seat Integrity**:
   - The server never trusts ticket prices sent from the browser. Prices and discounts (+15% tier, 50% Child ≤12 discount, 50% Member 10-ticket bundle) are verified against the screening's `base_price`.
   - PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) prevents two customers from booking the same seat concurrently (`HTTP 409 Conflict`).
3. **Resilient Continuity**:
   - If the external Open Movie API is unavailable, the application serves cached/seeded movies from PostgreSQL and local fallback state so Cinema RIO customers can continue buying tickets without interruption.

---

## 3. Database Schema — Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
  USERS {
    bigint id PK
    text email UK
    text password_hash
    text role "customer | staff | admin"
    timestamptz created_at
  }

  MOVIES {
    bigint id PK
    text title UK
    text description
    text genre
    integer duration_min
    integer release_year
    text age_rating
    text poster_url
    timestamptz created_at
    timestamptz updated_at
  }

  AUDITORIUMS {
    bigint id PK
    text name UK "Oulu/Tampere Auditorium 1 (100) & 2 (200)"
    integer seat_rows "10 or 20 rows (display skips Row 13)"
    integer seat_columns "10 seats per row (snake numbering)"
  }

  SCREENINGS {
    bigint id PK
    bigint movie_id FK
    bigint auditorium_id FK
    timestamptz starts_at "Doors open -15m, Ads 12m"
    numeric base_price "EUR"
    text status "scheduled | cancelled"
    timestamptz created_at
  }

  BOOKINGS {
    bigint id PK
    text booking_ref UK "FH-XXXXXXXXXX"
    text customer_name
    text customer_email
    bigint screening_id FK
    numeric total_price "EUR"
    text status "pending_payment | confirmed | cancelled"
    timestamptz created_at
  }

  BOOKING_SEATS {
    bigint id PK
    bigint booking_id FK
    bigint screening_id FK
    text seat_label "A1..T10 (mapped to Snake #)"
    numeric price "EUR"
  }

  MOVIES ||--o{ SCREENINGS : "scheduled in"
  AUDITORIUMS ||--o{ SCREENINGS : "hosts"
  SCREENINGS ||--o{ BOOKINGS : "has reservations"
  BOOKINGS ||--|{ BOOKING_SEATS : "reserves"
  SCREENINGS ||--o{ BOOKING_SEATS : "locks seat per screening"
```

---

## 4. Directory Structure
- **`client/`** — React 19 + Vite frontend application:
  - `src/data/rioCinemaData.js` — Cinema RIO Oulu & Tampere locations, auditorium specs, showtime rules, and resilient fallback catalog.
  - `src/utils/seatRules.js` — Snake seat numbering (skipping Row 13 and Seat #13), Row 1 wheelchair mapping, single-seat gap detection, guided seat suggestions, and showtime timeline helpers.
  - `src/components/SeatMap.jsx` — Interactive Cinema RIO Auditorium Seat Map with front screen, dual rear entrances, 15:00 hold timer, and orphan-seat auto-fix.
  - `src/components/CorporateBookingSection.jsx` — B2B corporate private screening request form.
  - `src/pages/HomePage.jsx` — Customer, Cashier, and Owner workspaces.
- **`server/`** — Express REST API (`routes/`, `controllers/`, `middleware/`, `services/`, `tests/`).
- **`database/`** — PostgreSQL schema migrations (`migrations/001_init.sql`, `002_movie_release_year.sql`) and demo seed scripts (`seeds/001_demo_data.sql`).
- **`docs/`** — Requirements engineering, product backlog, sprint planning workbook log, and Git workflow.
