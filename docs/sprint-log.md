# Cinema RIO (FilmHall) — Project Planning Workbook & Sprint Log

- **Project Name**: Cinema RIO (FilmHall) — Oulu & Tampere
- **Requirements Baseline**: `docs/requirements.md` (Approved MoSCoW Requirements & Client Interview Rules)
- **Team Roles**:
  - **Member 1 (Frontend & UI/UX Lead — `t3toru00`)**: React interfaces, Cinema RIO branding, interactive seat map (100 & 200 seats, Snake numbering, No Row 13/Seat #13, Row 1 wheelchair access), Customer/Staff authentication UI, and Stripe Checkout UI.
  - **Member 2 (Backend & API Lead — `sacharya345`)**: Express routes, authentication & authorization (`401`/`403`), booking validation, Stripe Checkout & webhook integration.
  - **Member 3 (Database & Backend Developer — `ashishnuniya24`)**: PostgreSQL schema & ERD, migrations, Oulu & Tampere auditorium seeds, transactional seat locking (`FOR UPDATE`), Azure DB setup.

---

## 1. Course Schedule Alignment & Weekly Goals Checklist

### Week 1 (26.10 – 30.10.2026) — Requirements, Agile, CI/CD & Git Setup
*Lectures: Intro & Requirements (26.10), Agile (28.10), Planning projects (28.10), CI/CD & Azure Deployment (29.10)*
- [x] **Requirements document started** (`docs/requirements.md`)
- [x] **Product backlog creation with user stories started** (`docs/product-backlog.md` — `US01` to `US15`)
- [x] **Features prioritized (Must / Should / Could have)** (`docs/requirements.md`)
- [x] **GitHub repository set up with structure** (`client/`, `server/`, `database/`, `docs/`)
- [x] **Git workflow and branching strategy agreed** (`docs/git-workflow.md`)
- [x] **Local development environment working** (Vite React + Express + PostgreSQL)
- [x] **Team roles and responsibilities defined** (`docs/team-roles.md`, `docs/team-rules.md`)

---

### Week 2 (02.11 – 06.11.2026) — Authentication & Core Architecture
*Lectures: Authentication & authorization — user register, login, protected resource (02.11), Sprint Delivery (Fri)*
*(Note: In Week 2 our team had a Git repository issue; all Week 2 technical goals were migrated and verified in the new repository `Rio-Movie-Hall` for Week 3 review.)*
- [x] **Architecture diagram completed** (`architecture.md` — Mermaid System Architecture)
- [x] **Database schema (ERD) finalized** (`architecture.md` & `database/migrations/001_init.sql`)
- [ ] **Azure accounts created & resources provisioned (App Services, Database)** *(In progress with Backend/DB team)*
- [x] **Authentication & Authorization implemented** (Customer register/login UI + Staff JWT login & protected `/api/admin/*` endpoints)
- [x] **Something works: At least 2–3 features functional end-to-end**:
  1. Browse & filter movies by Oulu/Tampere location, title, and genre (`US01`, `US02`, `US03`, `US15`)
  2. View movie showtimes with Doors (-15m) & Ads (12m) schedule (`US04`)
  3. View 100-seat & 200-seat Auditorium Seat Map and select seats (`US05`, `US06`)
- [x] **Code is on GitHub**: Clean feature-branch commits and Pull Requests
- [x] **Team has met regularly**: Standup notes documented below & GitHub Project board updated
- [x] **Basic architecture in place**: Frontend (`client/`) + Backend (`server/`) + Database (`database/`) connected

---

### Week 3 (09.11 – 13.11.2026 — CURRENT WEEK) — Payment Integration & Week 2 Recovery
*Lectures: Mon Payment Integration / Stripe sandbox guide (09.11), Wed Guest Lecture Harri Lainio OP: Development with AI (11.11)*
- [x] **Re-initialize clean Git repository (`Rio-Movie-Hall`)** and merge Frontend & Docs via Pull Request
- [x] **Cinema RIO Brand & Auditorium Seat Map (`client/src/components/SeatMap.jsx`)**:
  - Gold, Black, and Red theme with Cinema RIO marquee logo
  - Oulu (Kauppurienkatu 45) & Tampere (Hämeenkatu 27) location filter
  - 100-seat & 200-seat auditorium layout: Snake numbering from screen (10 seats/row), skips Row 13 and Seat #13, Row 1 reserved for `♿` Wheelchair access, rear left & right entrances
- [x] **Payment Integration UI (`client/src/pages/HomePage.jsx`)**:
  - **Mode 1 — Pay Online Now (Guest or Member)**: Direct booking confirmation + **Stripe Hosted Checkout** redirect button (`POST /api/checkout-sessions`)
  - **Mode 2 — Reserve & Pay at Theater Counter**: Requires Customer Account login, max 6 tickets, auto-cancelled if unpaid 2 hours before showtime

---

### Week 4 (16.11 – 20.11.2026) — Smart Seat Validation & Stripe Webhook Sync
- [ ] **Frontend (`t3toru00`)**:
  - Single-seat gap ("orphan seat") detector and auto-resolve button
  - *"★ Guide me (Suggest best seats)"* smart seat helper for 1–6 guests
  - 15-minute temporary seat hold countdown timer (`15:00`)
- [ ] **Backend & DB (`sacharya345`, `ashishnuniya24`)**:
  - Complete Stripe sandbox webhook (`POST /api/stripe/webhook`) & 15-minute pending seat lock expiration

---

### Week 5 (23.11 – 27.11.2026) — Discounts, Loyalty & Presentation Skills
*Mandatory Lesson: **Presentation skills lesson 26.11. 16:00–17:30 (Room 5B125)***
- [ ] **Frontend (`t3toru00`)**:
  - Child (≤12 years) 50% discount selector in checkout
  - Registered Member 10-ticket 50% loyalty bundle toggle
  - +15% cinema tier pricing breakdown and Staff live seat-cancellation alerts
- [ ] **All Team Members**: Attend Presentation Skills lesson (`26.11, 16:00–17:30, 5B125`)

---

### Week 6 (30.11 – 04.12.2026) — B2B Corporate Booking, Entrance Checker & Azure Deployment
- [ ] **Frontend (`t3toru00`)**:
  - B2B Corporate Private Showtime request page (`CorporateBookingSection.jsx`)
  - Staff Entrance Ticket Checker (`FH-...` reference verification) & Owner KPI summary cards
  - Deploy Vite React frontend to **Azure Static Web App**
- [ ] **Backend & DB (`sacharya345`, `ashishnuniya24`)**:
  - Deploy Express API + PostgreSQL database to **Azure App Service**

---

### Week 7 (07.12 – 11.12.2026) — Everything Ready and Returned
*Course Milestone: **Everything ready and returned***
- [ ] End-to-end testing on live Azure URLs (Frontend + Backend + PostgreSQL + Stripe Sandbox)
- [ ] Finalize `README.md`, `architecture.md`, `docs/requirements.md`, and GitHub Project Board (`100% Done`)
- [ ] Final project submission

---

### Week 8 (14.12 – 18.12.2026) — Final Presentations & Peer Review
*Course Milestones: **Final presentations** & **DL: Peer review***
- [ ] Deliver team final presentation & live Cinema RIO demo
- [ ] Submit individual Peer Review before deadline (`DL: Peer review`)

---

## 2. Team Standup & Coordination Log (Evidence of Regular Meetings)

### Week 1 Standups (26.10 – 30.10.2026)
- **Outcome**: Completed client interview notes for Cinema RIO (Oulu & Tampere), created initial backlog (`US01–US15`), prioritized MoSCoW requirements, and defined 3-member roles.

### Week 2 Standups (02.11 – 06.11.2026)
- **Outcome**: Built initial PostgreSQL schema and Express routes. Encountered Git repository issues during Friday review; agreed with team to create a clean repository (`Rio-Movie-Hall`) and enforce feature-branch Pull Requests.

### Week 3 Standups (09.11 – 13.11.2026)
- **Monday 09.11 (After Payment Integration Lecture)**:
  - Reviewed Jukka's Stripe sandbox payment guide and the Week 2 goals checklist.
  - Assigned `t3toru00` to finalize `architecture.md` (Architecture Diagram + ERD), `docs/requirements.md`, the Cinema RIO frontend theme, 100/200-seat Auditorium Map, Customer Account auth UI, and Stripe/Counter checkout toggle.
- **Wednesday 11.11 (After Harri Lainio OP Guest Lecture)**:
  - Verified all Week 2 + Week 3 frontend features work end-to-end (`oxlint` 0 warnings/errors, `vite build` passed).
  - Opened Pull Request `feature/frontend-cinema-rio` for Friday Sprint Review.
