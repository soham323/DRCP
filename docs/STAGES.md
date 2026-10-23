# Stage Tracker
## Disaster Response Coordination Platform (DRCP)

| Field         | Value                                                  |
| :------------ | :----------------------------------------------------- |
| **Version**   | 1.4.0                                                  |
| **Status**    | Active                                                 |
| **Owner**     | Soham Khare                                            |
| **Created**   | 2026-10-23 16:35 IST                                   |
| **Updated**   | 2026-10-23 22:53 IST                                   |
| **Project**   | Disaster Response Coordination Platform (DRCP)         |

---

## Update History

| Version | Date & Time          | Summary of Changes                                                      |
| :------ | :------------------- | :---------------------------------------------------------------------- |
| 1.4.0   | 2026-10-23 22:53 IST | Completed Stage 1: ST-1-1, ST-1-2, ST-1-3, ST-1-4 all Done.            |
| 1.3.0   | 2026-10-23 22:50 IST | Commenced Stage 1; marked ST-1-1 through ST-1-4 In Progress.            |
| 1.2.0   | 2026-10-23 16:56 IST | Completed Stage 0: ST-0-1, ST-0-2, ST-0-3, ST-0-4 all Done.            |
| 1.1.0   | 2026-10-23 16:53 IST | Commenced Stage 0; marked ST-0-1 In Progress.                           |
| 1.0.0   | 2026-10-23 16:35 IST | Initial STAGES.md created with 7 stages (Stage 0 - Stage 6) and 24 tasks.|

---

## Progress Summary

| Metric         | Count |
| :------------- | :---- |
| Total Tasks    | 24    |
| ✅ Done        | 8     |
| 🟡 In Progress | 0     |
| 🔵 Testing     | 0     |
| 🔴 Blocked     | 0     |
| ⬜ To Do       | 16    |

---

## Stage Definitions

### Stage 0: Project Scaffolding & Foundations
**Goal**: Establish the Node.js TypeScript workspace, database schemas, ORM configuration, seed data, and core middlewares.  
**Depends On**: None  
**Scalability Note**: Modular architecture with Prisma ORM allows zero-friction local SQLite execution while maintaining 100% schema parity with PostgreSQL.

| Task ID | Task Description | Status | Related FRs / NFRs | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **ST-0-1** | Initialize Node.js TypeScript project, dependencies (Express, Socket.io, Prisma, Zod, Vitest, Supertest), and tsconfig. | ✅ Done | NFR-002, NFR-005 | Root setup complete |
| **ST-0-2** | Configure `prisma/schema.prisma` (Disaster, EmergencyResource, CommunityReport, User) and generate client. | ✅ Done | FR-001, FR-009, FR-012 | SQLite dev.db created |
| **ST-0-3** | Implement structured configuration loader (`src/config/`), RFC 7807 error classes, and global error handling middleware. | ✅ Done | FR-006, NFR-004 | Error safety ready |
| **ST-0-4** | Create comprehensive database seed script (`prisma/seed.ts`) with realistic disasters and resources (Manhattan & global). | ✅ Done | FR-009, NFR-002 | Seed verified |

---

### Stage 1: Core Disaster Management Domain & API
**Goal**: Deliver full CRUD operations for disaster incidents with natural language location extraction and fallback geocoding.  
**Depends On**: Stage 0  
**Scalability Note**: Geocoding engine encapsulates fallback logic so third-party geocoder failures never degrade incident creation.

| Task ID | Task Description | Status | Related FRs / NFRs | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **ST-1-1** | Implement Disaster Repository & Service Layer (`src/modules/disasters/`). | ✅ Done | FR-001, FR-002, FR-003 | Clean data access |
| **ST-1-2** | Build NLP Location Extractor & Geocoding Service with Nominatim integration and resilient coordinate hub fallback. | ✅ Done | FR-007, FR-008, NFR-003 | No API key needed |
| **ST-1-3** | Implement Disaster Controller (`POST`, `GET /:id`, `PATCH /:id`, `DELETE /:id`) with Zod request validation. | ✅ Done | FR-001, FR-003, FR-004, FR-006 | Strict validation |
| **ST-1-4** | Add filtering query parameters (`GET /disasters?tag=&status=&limit=&offset=`). | ✅ Done | FR-002 | Tag & status filters |

---

### Stage 2: Geospatial Search, Resources & Caching
**Goal**: Implement mathematical Haversine radius search for emergency assets and Cache-Aside pattern for external feeds.  
**Depends On**: Stage 1  
**Scalability Note**: CacheStore interface allows swapping in-memory LRU for distributed Redis clusters without modifying service business logic.

| Task ID | Task Description | Status | Related FRs / NFRs | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **ST-2-1** | Implement and unit-test Haversine great-circle calculation utility (`src/common/haversine.ts`). | ⬜ To Do | FR-010, NFR-001 | Sub-millisecond math |
| **ST-2-2** | Implement Emergency Resource Service & Endpoint (`GET /disasters/:id/resources?radius=&lat=&lng=&type=`). | ⬜ To Do | FR-009, FR-010, FR-011 | Radius filtering |
| **ST-2-3** | Implement Cache-Aside Layer (`src/cache/`) with In-Memory LRU cache and configurable TTLs. | ⬜ To Do | FR-014, NFR-001 | Cache-aside hit/miss |
| **ST-2-4** | Implement External Social Reports Mock Feed & Normalization Service (`GET /disasters/:id/reports`) with circuit-breaker fallback. | ⬜ To Do | FR-012, FR-013, FR-014 | Outage tolerance |

---

### Stage 3: Real-Time Updates & Role-Based Authorization
**Goal**: Wire Socket.io real-time event broadcasting and token-based RBAC enforcement across all routes.  
**Depends On**: Stage 2  
**Scalability Note**: Decoupled Socket.io broadcaster enables mobile app clients (React Native) to subscribe directly to live event streams.

| Task ID | Task Description | Status | Related FRs / NFRs | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **ST-3-1** | Setup Socket.io server engine (`src/realtime/socket.ts`) and broadcast `disaster_created` and `disaster_updated` events. | ⬜ To Do | FR-015 | Real-time push |
| **ST-3-2** | Build Authentication & RBAC Middleware supporting Bearer tokens and `x-user-role` headers (`admin`, `contributor`, `viewer`). | ⬜ To Do | FR-016, FR-017 | Mock / JWT auth |
| **ST-3-3** | Enforce RBAC permissions: protect mutations, restrict `DELETE` to `admin`, allow public read-only access. | ⬜ To Do | FR-005, FR-017 | Security enforcement |

---

### Stage 4: Automated Testing Suite
**Goal**: Build a robust automated test suite validating API endpoints, schemas, business logic, authorization, and resilience.  
**Depends On**: Stage 3  
**Scalability Note**: Comprehensive automated testing guarantees zero regression and provides clear executable proof for technical reviewers.

| Task ID | Task Description | Status | Related FRs / NFRs | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **ST-4-1** | Write integration tests for Disaster CRUD and schema validation error scenarios (`tests/disaster.test.ts`). | ⬜ To Do | TS-001, TS-002 | 400 Bad Request check |
| **ST-4-2** | Write unit and integration tests for Geospatial Haversine radius calculations (`tests/geospatial.test.ts`). | ⬜ To Do | TS-004 | 5km vs 25km radius |
| **ST-4-3** | Write security tests for RBAC rules: `admin` vs `contributor` vs `viewer` (`tests/auth.test.ts`). | ⬜ To Do | TS-003 | 403 Forbidden check |
| **ST-4-4** | Write caching and resilience tests: verify `X-Cache: MISS` $\rightarrow$ `X-Cache: HIT` and simulated outage fallback (`tests/caching.test.ts`). | ⬜ To Do | TS-005, TS-006 | Cache hit & fallback |

---

### Stage 5: Interactive Web & Mobile-Ready Verification Dashboard (PWA)
**Goal**: Deliver a responsive, mobile-first Web / PWA dashboard with interactive Leaflet map to visually demonstrate platform capabilities.  
**Depends On**: Stage 3  
**Scalability Note**: Built with standard PWA manifest and mobile viewport, allowing immediate mobile installation or React Native reuse.

| Task ID | Task Description | Status | Related FRs / NFRs | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **ST-5-1** | Scaffold lightweight React 18 + Vite dashboard with responsive mobile-first styling in `client/`. | ⬜ To Do | NFR-002 | Clean UI framework |
| **ST-5-2** | Integrate Leaflet.js interactive map displaying disaster pins, resource markers, and radius circles. | ⬜ To Do | FR-010 | Visual geospatial map |
| **ST-5-3** | Connect live Socket.io real-time alert ticker and disaster reporting form to demonstrate live events. | ⬜ To Do | FR-015 | End-to-end demo |

---

### Stage 6: Documentation, README & Submission Packaging
**Goal**: Author executive-grade README, `.env.example`, Postman collection, and AI-assisted development disclosures.  
**Depends On**: Stage 4, Stage 5  
**Scalability Note**: Delivers every single submission requirement specified by Santrionn Technologies.

| Task ID | Task Description | Status | Related FRs / NFRs | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **ST-6-1** | Write comprehensive `README.md` (Setup, Architecture, DB Rationale, Geospatial explanation, Caching strategy, Trade-offs). | ⬜ To Do | NFR-002, NFR-005 | Core deliverable |
| **ST-6-2** | Document AI-assisted development disclosure section detailing tools used, manual modifications, and validation. | ⬜ To Do | NFR-005 | Required disclosure |
| **ST-6-3** | Export Postman API Collection / OpenAPI specification and verify `.env.example` completeness. | ⬜ To Do | NFR-002 | API docs |
| **ST-6-4** | Perform clean-clone sanity check: test `npm install`, `npm run seed`, `npm test`, and `npm run dev`. | ⬜ To Do | NFR-002 | Zero-friction verify |

---

## Blocked Items Log

*No tasks are currently blocked.*

---

## Scalability & Future Architecture Notes

> These notes capture forward-looking architectural decisions that influence current implementation choices while keeping the MVP lightweight and cost-effective.

- **Note 1 (PostgreSQL / PostGIS Transition):** The Prisma schema and data types are 100% compatible with PostgreSQL. When production spatial indexing at 100k+ assets is required, simply update `provider = "postgresql"` in `schema.prisma` and leverage PostGIS `ST_DWithin` spatial indexes.
- **Note 2 (Distributed Caching with Redis Cluster):** The `CacheStore` interface abstracts storage operations (`get`, `set`, `del`). Swapping in-memory LRU for Redis Cluster requires zero code modifications outside `src/cache/`.
- **Note 3 (Native Mobile App Packaging):** The `client/src/services/api.ts` module and Socket.io client are designed to be copied directly into an Expo / React Native project, enabling native iOS and Android apps with zero backend rework.
- **Note 4 (Event-Driven Message Queues):** In Phase 2, third-party social media ingestion and external geocoding calls can be offloaded to BullMQ / Redis queues for asynchronous background processing during crisis spikes.
