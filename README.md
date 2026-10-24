# Disaster Response Coordination Platform (DRCP)

A lightweight, resilient, backend-focused disaster response and crisis coordination platform built for municipal authorities, emergency responders, and community coordinators. DRCP enables rapid incident reporting, automated natural language location extraction, mathematical Haversine proximity search for vital resources, resilient external feed normalization with Cache-Aside caching, real-time WebSocket push updates, and cryptographic Role-Based Access Control (RBAC).

---

## 1. Architecture Overview

DRCP is structured as a clean, decoupled monorepo comprising a high-performance Node.js/Express backend (`server/`) and an interactive React 18/Vite verification dashboard (`client/`).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (CROSS-PLATFORM)                   │
├───────────────────────────────────┬────────────────────────────────────┤
│ React 18 + Vite (Web / PWA)       │ Future Native Mobile (React Native)│
│ - Leaflet.js Interactive Map      │ - iOS / Android Native Views       │
│ - Real-Time Alert Ticker          │ - Push Notifications               │
│ - Haversine Radius Circle (1-50km)│ - Offline Resource Caching         │
│ - Swiggy-Style Pin Drop & GPS     │ - Device Hardware Geolocation      │
└─────────────────┬─────────────────┴──────────────────┬─────────────────┘
                  │ HTTP / REST                        │ Socket.io (WS)
                  ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY & MIDDLEWARE LAYER                  │
├────────────────────────────────────────────────────────────────────────┤
│ Node.js + Express (TypeScript)                                         │
│ - Security Headers (Helmet, CORS)                                      │
│ - RFC 7807 Problem Details Error Envelope                              │
│ - Zod Request Validation & Schema Sanitization                         │
│ - RBAC Authentication (Cryptographic JWT Bearer / Database Scrypt Hash)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼───────────────────────────┐
       ▼                            ▼                           ▼
[ Disaster Service ]      [ Resource Service ]        [ Report & Cache Service ]
- NLP Entity Extractor    - Haversine Geospatial      - Cache-Aside Controller
- Nominatim / Fallback    - Radius Query Engine       - Mock Social API Adapter
- Lifecycle State Machine - Type Filtering            - Resilience Circuit Breaker
       │                            │                           │
       └────────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          PERSISTENCE & CACHING                         │
├──────────────────────────────────────────┬─────────────────────────────┤
│ Primary Database (Prisma ORM)            │ Cache Layer (CacheStore)    │
│ - SQLite (Zero-Config Reviewer Setup)    │ - In-Memory LRU (Default)   │
│ - PostgreSQL Compatible (Production)     │ - Redis Adapter (Interface) │
│ - Relational Cascades & B-Tree Indexes   │ - Dual TTL (Geo / Reports)  │
└──────────────────────────────────────────┴─────────────────────────────┘
```

---

## 2. Zero-Friction Startup with Docker (Recommended)

To run the entire platform with zero manual dependency installation or configuration:

```bash
# 1. Clone the repository
git clone <repo-url>
cd DRCP

# 2. Build and launch all services in containers
docker compose up --build
```

That's it! Docker automatically:
- Builds the Node.js 20 Alpine backend container (`drcp-server`).
- Applies Prisma database schema and seeds initial users, disasters, and resources into persistent volume `drcp-db`.
- Launches the Express & Socket.io server on `http://localhost:3000`.
- Multi-stage builds the React 18 + Vite frontend and serves via high-performance Nginx Alpine on `http://localhost:5173`.
- Reverses proxies all `/api/` and `/socket.io/` traffic to the backend seamlessly.

Open **`http://localhost:5173`** in your browser.

To stop the containers:
```bash
docker compose down
```

---

## 3. Native Local Setup (Without Docker)

If you prefer running directly on your host machine without Docker:

### Prerequisites
- **Node.js**: `>= 20.x`
- **npm**: `>= 10.x`

### Step 1: Install Dependencies
```bash
# Installs dependencies for both server/ and client/
npm run install:all
```

### Step 2: Configure Environment Variables
```bash
cp .env.example server/.env
```
*(Pre-configured development defaults in `server/.env` allow instant local execution).*

### Step 3: Initialize Database & Seed Crisis Data
```bash
# Generates Prisma client and seeds initial crisis data & users
npm run prisma:generate
npm run seed
```

### Step 4: Run the Automated Test Suite (61 Tests)
```bash
# Executes all 4 test suites covering auth, CRUD, geospatial, and caching
npm test
```

### Step 5: Start the Development Servers
In two separate terminals:
```bash
# Terminal 1: Backend API & Socket.io Server (http://localhost:3000)
npm run dev:server

# Terminal 2: React 18 + Vite Verification Dashboard (http://localhost:5173)
npm run dev:client
```

Open `http://localhost:5173` in your browser.

---

## 4. Seed Credentials for Testing

The database seed (`server/prisma/seed.ts`) automatically provisions test accounts using scrypt + salt hashing with passwords sourced strictly from the environment:

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin` | `Admin@123` | Full CRUD, disaster deletion, resource creation, settings |
| **CONTRIBUTOR** | `contributor` | `Contributor@123` | Create/update disasters and resources; cannot delete |
| **VIEWER** | `viewer` | `Viewer@123` | Read-only situational awareness |

---

## 5. Technical Decisions & Architectural Rationale

### 5.1 Database Selection: SQLite with Prisma ORM
- **Reviewer-First Zero Friction:** By utilizing embedded SQLite (`server/prisma/dev.db`), reviewers can clone, test, and run the platform immediately without provisioning local Docker containers, PostgreSQL services, or cloud credentials.
- **Enterprise Portability:** The schema is defined in Prisma (`server/prisma/schema.prisma`). Transitioning to enterprise PostgreSQL is as simple as updating `provider = "postgresql"` and `DATABASE_URL` with zero modifications to service layer code.

### 5.2 Geospatial Proximity Search: Algorithmic Haversine Great-Circle
- Rather than requiring PostGIS or external spatial database extensions, DRCP implements the mathematical **Haversine formula** directly in `server/src/common/haversine.ts`:
  $$\Delta\sigma = 2 \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)} \right)$$
  $$d = R \cdot \Delta\sigma \quad (R = 6371.0 \text{ km})$$
- **Performance:** Executes in $< 5\,\mu\text{s}$ per coordinate pair, providing sub-millisecond filtering and sorting across hundreds of emergency resources with $\pm 0.5\%$ spherical accuracy.
- **Filtering:** Supports dynamic search radius (1 km to 50 km) and emergency resource categorization (`SHELTER`, `HOSPITAL`, `FOOD`, `WATER`, `RESCUE`).

### 5.3 Caching Strategy: Cache-Aside Pattern
- DRCP protects upstream third-party APIs (such as external social media feeds) using an in-memory **Least Recently Used (LRU)** cache (`server/src/cache/memory-cache.ts`) backed by a generic `CacheStore` interface.
- **Request Flow:**
  1. Incoming `GET /api/v1/disasters/:id/reports`.
  2. Cache check: Key `reports:<disasterId>`.
  3. **Cache Hit:** Returns cached data with response header `X-Cache: HIT` (sub-millisecond response).
  4. **Cache Miss:** Fetches external social feed, normalizes payload, caches with a 120-second TTL, and returns `X-Cache: MISS`.
- **Extensibility:** The `CacheStore` interface decouples storage logic, allowing drop-in Redis Cluster support via `ioredis` with zero code changes to the controller or service layer.

### 5.4 External API Failure Handling & Circuit Breaker
- In emergency scenarios, external social platforms and geocoders frequently throttle traffic or crash (simulated via `HTTP 504 Gateway Timeout`).
- DRCP wraps external requests with timeout boundaries (`EXTERNAL_TIMEOUT_MS = 3000ms`).
- **Resilience Fallback:** When downstream feeds fail, the system activates a circuit-breaker fallback to locally archived community reports, returning `HTTP 200 OK` with the response header `X-Cache: DEGRADED`. The platform never crashes or returns unhandled 500 errors to the client.

### 5.5 Location Resolution: Dual-Engine Geocoding
1. **Natural Language Processing (NLP):** Regex entity extraction identifies geographic patterns from plain text descriptions (e.g., *"Flash flooding near Manhattan, NYC"* $\rightarrow$ *"Manhattan, NYC"*).
2. **OpenStreetMap Nominatim Integration:** Resolves entities to `[latitude, longitude]` without requiring paid API keys.
3. **Autonomous Coordinate Hub Fallback:** If external geocoders time out or fail, an embedded coordinate dictionary instantly resolves major regional hubs.
4. **Interactive Swiggy-Style Pin Drop:** Field responders can tap **"Use Device GPS"** (`navigator.geolocation`) or drag an interactive teardrop marker on the Leaflet map to drop coordinates manually.

---

## 6. Security Architecture & RBAC

1. **Cryptographic Password Hashing:** Node.js native `crypto.scrypt` with a cryptographically secure 16-byte random salt generated via `crypto.randomBytes(16)`. Passwords are stored in the database in `<salt>:<hash>` format.
2. **System-Determined Roles & Registration Choice:** During registration (`POST /api/v1/auth/register`), users can choose between `CONTRIBUTOR` and `VIEWER` roles (defaults to `CONTRIBUTOR`). The selected role is saved securely in the database. Client header role self-claiming is strictly rejected with `HTTP 401 Unauthorized`, and attempting to self-assign `ADMIN` during registration is rejected with `HTTP 400 Bad Request`.
3. **Cryptographic Session Tokens:** Standard `HS256` signed JWTs with 24-hour expiration containing database-verified identities.
4. **Endpoint Permission Matrix:**
   - `POST /api/v1/disasters` $\rightarrow$ `ADMIN`, `CONTRIBUTOR`
   - `PATCH /api/v1/disasters/:id` $\rightarrow$ `ADMIN`, `CONTRIBUTOR`
   - `DELETE /api/v1/disasters/:id` $\rightarrow$ Restricted strictly to `ADMIN` (returns `HTTP 403 Forbidden` for contributors)
   - `GET /api/v1/disasters` $\rightarrow$ Public read-only access
   - `GET /api/v1/disasters/:id/resources` $\rightarrow$ Public read-only access

---

## 7. Real-Time Communication

- Integrated **Socket.io** engine (`server/src/realtime/socket.ts`) broadcasting crisis events across connected responders:
  - `disaster_created`: Broadcast when a new incident is reported.
  - `disaster_updated`: Broadcast when an incident status, description, or location changes.
  - `disaster_deleted`: Broadcast when an administrator deletes an incident.
- Frontend dashboard (`client/`) subscribes to the websocket channel, immediately updating the Leaflet map markers, disaster cards, and audio-visual alert ticker without requiring browser polling.

---

## 8. Trade-offs & Deliberate Simplifications

1. **In-Memory Cache vs. Distributed Redis:** An in-process LRU cache was chosen as the default to ensure zero external infrastructure dependencies during grading. The codebase provides a pluggable `CacheStore` interface for switching to Redis in multi-instance production environments.
2. **Application-Layer Haversine vs. PostGIS:** Application-level Haversine calculation ensures full portability across SQLite and PostgreSQL without needing OS-level C-extension libraries (`libspatialite`).
3. **Internal Auth vs. OAuth2 / SSO:** To ensure reviewers can run and test all authentication flows offline without external cloud accounts (Google/Auth0), secure scrypt+salt password hashing and JWT authentication were implemented natively.
4. **External Social Feed Mock:** Real Twitter/X API access requires enterprise API subscriptions and rate limits; DRCP uses a realistic external feed simulator with configurable latency, payload normalizer, and error injection.

---

## 9. AI Usage Disclosure (Santrionn Assignment Requirement)

- **AI Coding Tool Used:** Google Antigravity (Advanced Agentic AI pair programming assistant).
- **What It Helped With:**
  - Rapid scaffolding of TypeScript interfaces, Zod schema validation rules, and RFC 7807 error envelopes.
  - Mathematical formulation of the Haversine Great-Circle distance formula and spherical trigonometry.
  - Generating comprehensive Vitest test cases across all four test suites.
  - Setting up the React 18 + Vite dashboard with Leaflet map bindings.
- **What Was Manually Designed, Implemented & Validated:**
  - System architecture planning and formal documentation ([`TRD.md`](file:///d:/Projects/Dissaster/docs/TRD.md), [`TDS.md`](file:///d:/Projects/Dissaster/docs/TDS.md), [`STAGES.md`](file:///d:/Projects/Dissaster/docs/STAGES.md)).
  - Security hardening: Enforcing `crypto.scrypt` password hashing, database-enforced roles, eliminating client header spoofing, and strict environment credential isolation.
  - Monorepo decoupling into distinct `server/` and `client/` workspaces with root orchestrator scripts.
  - Circuit-breaker degradation logic and `X-Cache` response inspection.
  - Interactive Swiggy/Zomato style pin-drop location picker with HTML5 device GPS and Nominatim autocomplete.

---

## 10. Automated Testing Suite

The platform includes **61 comprehensive automated tests** built with Vitest and Supertest:

```bash
npm test
```

### Test Coverage Highlights:
1. **Disaster Lifecycle & CRUD (`server/tests/disaster.test.ts` - 16 tests):**
   - Incident creation with explicit coordinates vs. NLP entity extraction.
   - Filtering by tag (`?tag=flood`) and status (`?status=ACTIVE`).
   - RFC 7807 schema validation errors (empty titles, short descriptions).
   - Admin-only deletion enforcement (`HTTP 204` vs `HTTP 403`).
2. **Geospatial Proximity & Radius Search (`server/tests/geospatial.test.ts` - 9 tests):**
   - Haversine mathematical calculation unit tests.
   - Resource radius filtering (3 km vs 20 km vs 50 km).
   - Ascending distance sorting verification.
   - Resource categorization filtering (`?type=WATER`, `?type=HOSPITAL`).
3. **Authentication & RBAC (`server/tests/auth.test.ts` - 30 tests):**
   - Password registration and scrypt+salt hashing.
   - User role choice on registration (`CONTRIBUTOR` vs `VIEWER`).
   - Rejection of unauthorized `ADMIN` self-assignment during registration.
   - JWT authentication lifecycle (`POST /auth/login`, `GET /auth/me`).
   - Rejection of forged client role headers.
   - Strict RBAC matrix verification across admin, contributor, and viewer roles.
4. **Caching & Outage Resilience (`server/tests/caching.test.ts` - 6 tests):**
   - LRU memory cache storage, retrieval, and TTL expiration.
   - Cache-Aside lifecycle (`X-Cache: MISS` $\rightarrow$ `X-Cache: HIT`).
   - Circuit-breaker resilience under simulated downstream 504 gateway timeout (`X-Cache: DEGRADED`).

---

## 11. Postman Collection

A complete Postman collection is available at [`docs/DRCP_Postman_Collection.json`](file:///d:/Projects/Dissaster/docs/DRCP_Postman_Collection.json).
- Contains pre-configured requests for Health, Auth, Disaster CRUD, Geospatial Radius Queries, and Community Reports.
- Includes automated test scripts that automatically save JWT tokens and disaster IDs to collection variables for frictionless testing.
