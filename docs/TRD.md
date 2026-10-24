# Technical Requirements Document
## Disaster Response Coordination Platform (DRCP)

| Field         | Value                                                  |
| :------------ | :----------------------------------------------------- |
| **Version**   | 1.1.0                                                  |
| **Status**    | Approved                                               |
| **Owner**     | Soham Khare                                            |
| **Created**   | 2026-10-23 15:40 IST                                   |
| **Updated**   | 2026-10-24 11:45 IST                                   |
| **Project**   | Disaster Response Coordination Platform (DRCP)         |

---

## Update History

| Version | Date & Time          | Summary of Changes                                                          |
| :------ | :------------------- | :-------------------------------------------------------------------------- |
| 1.1.0   | 2026-10-24 11:45 IST | Hardened Authentication & RBAC: Enforced password verification (scrypt+salt), system-assigned database roles, removal of client header role self-claiming, and strictly validated JWT / API-key authorization. |
| 1.0.1   | 2026-10-23 16:11 IST | Updated document owner to Soham Khare                                      |
| 1.0.0   | 2026-10-23 15:40 IST | Initial TRD created covering all 8 core assignment areas, NFRs, and test cases |

---

## 1. Executive Summary

The Disaster Response Coordination Platform (DRCP) is a lightweight, resilient, backend-centric coordination engine designed to bridge emergency incident reporting with real-time geospatial relief logistics. Built to operate under crisis conditions, the platform enables municipal authorities, humanitarian responders, and affected communities to register disaster incidents, automatically resolve geolocations from unstructured narrative descriptions, discover nearby vital resources within custom radii, and aggregate community reports.

The platform is designed around the core engineering principles of high availability, fault tolerance, cost control, and clean domain isolation. By implementing a Cache-Aside strategy for external dependencies, resilient fallback pipelines for geographic entity extraction, role-based authorization for data integrity, and real-time push telemetry via WebSockets or Server-Sent Events (SSE), DRCP provides reliable operational continuity even during peak disaster traffic and downstream service disruptions.

As a foundational platform implementation, the system focuses on clean API design, robust input validation, predictable error contracts, and production-minded code structure, accompanied by automated integration tests and an interactive verification interface.

---

## 2. Business Context

Natural and human-induced disasters create rapid information overload paired with severe physical disorientation. First responders and crisis coordinators routinely encounter:
* **Unstructured crisis reports:** Dispatches and social posts lack GPS coordinates, requiring manual geographic interpretation.
* **Logistical blindness:** Emergency teams cannot instantaneously compute which emergency shelters, triage clinics, or water distribution depots fall within safe operational radii.
* **Cascading service failures:** Public traffic spikes crash unbuffered backend systems and burn through expensive third-party geocoding and social feed API quotas.
* **Information contamination:** Unauthenticated tampering or false alarms erode public trust and misdirect limited emergency personnel.

DRCP solves these problems by providing an automated, resilient, and role-governed coordination layer that extracts spatial intelligence from plain text, indexes critical relief assets with low-latency geospatial querying, protects upstream APIs via intelligent caching, and broadcasts state changes to field units in real time.

---

## 3. Scope

### 3.1 In Scope
1. **Disaster Incident Management:** Full lifecycle RESTful CRUD APIs with dynamic tag and status filtering.
2. **Automated Location Resolution:** Natural language entity extraction identifying locations in disaster descriptions with geocoding to `(latitude, longitude)`, backed by an autonomous fallback engine.
3. **Geospatial Proximity Search:** Radius-based spatial querying matching registered emergency resources (shelters, hospitals, food, water, rescue) to incident or query coordinates.
4. **Community Reports Normalization:** Ingestion, sanitization, and standardized transformation of external social media feeds.
5. **Cache-Aside Architecture:** In-memory / distributed caching with defined TTLs to protect external feeds and optimize latency.
6. **Real-Time Push Notifications:** Event emission (`disaster_created`, `disaster_updated`) via WebSocket or Server-Sent Events (SSE).
7. **Role-Based Access Control (RBAC) & Credentialed Auth:** Database-backed password authentication (scrypt + salt), system-assigned roles, and cryptographic JWT / API-key authorization differentiating `ADMIN`, `CONTRIBUTOR`, and `VIEWER` permissions. Client role self-claiming via headers is strictly forbidden.
8. **Automated Test Suite:** Integration and unit tests validating endpoints, schema enforcement, business rules, and integration mocks.
9. **Interactive Verification UI:** Single-page dashboard with interactive Leaflet map to visually demonstrate radius queries and real-time events.

### 3.2 Out of Scope
1. Enterprise Multi-Factor Authentication (MFA) and external OAuth2 third-party SSO (internal password hashing with scrypt and signed JWTs are used).
2. Direct satellite telemetry or real-time GPS fleet tracking hardware.
3. Live production billing systems or commercial SMS gateways.
4. Heavy microservice decomposition (a clean modular monolith is prioritized for velocity and low operational overhead).

---

## 4. Functional Requirements

### 4.1 Disaster Incident Management (FR-001 – FR-006)

#### FR-001: Create Disaster Incident
- **Category**: Core / Domain
- **Priority**: P0-Critical
- **Description**: Authorized users (`admin`, `contributor`) can report a new disaster incident with title, description, optional explicit location, and tags.
- **Acceptance Criteria**:
  - [ ] Supports `POST /disasters`.
  - [ ] Validates presence and length of `title` (3-100 chars) and `description` (10-2000 chars).
  - [ ] If explicit coordinates (`lat`, `lng`) are not provided, triggers automated location resolution (FR-007).
  - [ ] Emits real-time event `disaster_created` upon successful creation.
  - [ ] Returns HTTP 201 Created with full disaster entity including generated UUID and timestamps.
- **Dependencies**: None

#### FR-002: List & Filter Disasters
- **Category**: Core / API
- **Priority**: P0-Critical
- **Description**: Any client can list disaster incidents with optional filtering by tag, status, and pagination.
- **Acceptance Criteria**:
  - [ ] Supports `GET /disasters`.
  - [ ] Supports query parameter `?tag=<tag>` (e.g., `?tag=flood`).
  - [ ] Supports query parameter `?status=<status>` (e.g., `?status=active`).
  - [ ] Supports query parameters `?limit=<n>` and `?offset=<n>`.
  - [ ] Returns HTTP 200 OK with array of matching disasters and total count metadata.
- **Dependencies**: None

#### FR-003: Retrieve Disaster by ID
- **Category**: Core / API
- **Priority**: P0-Critical
- **Description**: Retrieve detailed information for a single disaster by its unique identifier.
- **Acceptance Criteria**:
  - [ ] Supports `GET /disasters/:id`.
  - [ ] Returns HTTP 200 OK with full disaster payload if ID exists.
  - [ ] Returns HTTP 404 Not Found if ID does not exist.
  - [ ] Returns HTTP 400 Bad Request if ID format is invalid.
- **Dependencies**: None

#### FR-004: Update Disaster Incident
- **Category**: Core / Domain
- **Priority**: P0-Critical
- **Description**: Authorized users (`admin`, `contributor`) can partially update disaster status, description, title, or tags.
- **Acceptance Criteria**:
  - [ ] Supports `PATCH /disasters/:id`.
  - [ ] Validates update payload fields against schema.
  - [ ] Re-resolves location coordinates if `description` or `location.name` is modified without explicit coordinates.
  - [ ] Automatically updates `updated_at` timestamp.
  - [ ] Emits real-time event `disaster_updated` upon successful update.
  - [ ] Returns HTTP 200 OK with updated entity.
- **Dependencies**: FR-001

#### FR-005: Delete Disaster Incident
- **Category**: Core / Security
- **Priority**: P1-High
- **Description**: Only `admin` users can delete a disaster incident record.
- **Acceptance Criteria**:
  - [ ] Supports `DELETE /disasters/:id`.
  - [ ] Enforces `admin` role restriction; returns HTTP 403 Forbidden for `contributor` or unauthenticated users.
  - [ ] Returns HTTP 204 No Content upon successful deletion.
  - [ ] Returns HTTP 404 Not Found if disaster does not exist.
- **Dependencies**: FR-001, FR-015

#### FR-006: Incident Validation & Error Consistency
- **Category**: Core / API
- **Priority**: P0-Critical
- **Description**: All incoming payloads must be strictly validated before reaching service logic, returning uniform RFC 7807 problem details or structured error envelopes.
- **Acceptance Criteria**:
  - [ ] All inputs validated via strict schema validation (e.g., Zod / Joi).
  - [ ] Invalid fields return HTTP 400 Bad Request with an array of specific field errors: `{"status": "error", "message": "Validation failed", "errors": [...]}`.
  - [ ] Unhandled exceptions return HTTP 500 Internal Server Error without leaking server stack traces.
- **Dependencies**: None

---

### 4.2 Location Resolution & Geocoding (FR-007 – FR-008)

#### FR-007: Entity Extraction from Plain Text
- **Category**: Domain / Processing
- **Priority**: P0-Critical
- **Description**: When a disaster is created with a narrative description (e.g., *"Heavy flooding has affected Manhattan, NYC"*), the system extracts the geographic entity (`Manhattan, NYC`).
- **Acceptance Criteria**:
  - [ ] Parses incoming description string to identify named geographic landmarks/cities/regions.
  - [ ] Employs NLP pattern matching / regex heuristics with fallback to LLM or predefined hub dictionary.
  - [ ] Populates `location.name` on the disaster record.
- **Dependencies**: FR-001

#### FR-008: Coordinate Geocoding with Resilient Fallback
- **Category**: Integration / Resilience
- **Priority**: P0-Critical
- **Description**: Resolves extracted location name into geographic latitude and longitude coordinates, with a robust fallback mechanism.
- **Acceptance Criteria**:
  - [ ] Queries geocoding provider (e.g., OpenStreetMap Nominatim or mock geocoding provider).
  - [ ] If geocoder fails, times out (> 2000ms), or network is disconnected, falls back gracefully to a curated local geographic registry or default centroid.
  - [ ] Saves `location.latitude` and `location.longitude` as valid floating-point degrees (`-90 <= lat <= 90`, `-180 <= lng <= 180`).
  - [ ] Never fails a disaster creation request due to an external geocoding outage.
- **Dependencies**: FR-007

---

### 4.3 Nearby Resources & Geospatial Search (FR-009 – FR-011)

#### FR-009: Emergency Resource Entity Management
- **Category**: Data & Storage
- **Priority**: P0-Critical
- **Description**: Maintain registered emergency relief resources across five required types: `shelter`, `hospital`, `food`, `water`, and `rescue`.
- **Acceptance Criteria**:
  - [ ] Resource entity schema contains: `id` (UUID), `name` (string), `type` (enum: shelter, hospital, food, water, rescue), `location` (`name`, `latitude`, `longitude`), `capacity` (optional integer), `status` (`available`, `depleted`, `closed`).
  - [ ] Includes seed dataset of emergency resources around major geographic test zones (e.g., Manhattan NYC, Mumbai, London) to facilitate immediate local testing.
- **Dependencies**: None

#### FR-010: Radius-Based Geospatial Proximity Query
- **Category**: API / Geospatial
- **Priority**: P0-Critical
- **Description**: Retrieve all emergency resources located within a specified radius around a disaster incident or target coordinates.
- **Acceptance Criteria**:
  - [ ] Supports `GET /disasters/:id/resources?lat=<lat>&lng=<lng>&radius=<km>`.
  - [ ] If `lat` and `lng` query parameters are omitted, automatically uses the resolved coordinates of disaster `:id`.
  - [ ] If `radius` is omitted, defaults to a safe configurable radius (e.g., `10` km).
  - [ ] Validates `radius` is a positive number (`0.1 <= radius <= 500`).
  - [ ] Calculates distance using the Haversine great-circle formula or database spatial index.
  - [ ] Each returned resource includes a calculated `distance_km` property rounded to 2 decimal places.
  - [ ] Results sorted by ascending distance (nearest first).
- **Dependencies**: FR-003, FR-009

#### FR-011: Optional Resource Type Filter
- **Category**: API / Geospatial
- **Priority**: P2-Medium
- **Description**: Allow responders to filter nearby resources by specific type (e.g., only `hospital` or `water`).
- **Acceptance Criteria**:
  - [ ] Supports `GET /disasters/:id/resources?type=water&radius=15`.
  - [ ] Returns only resources matching the requested type within the specified radius.
- **Dependencies**: FR-010

---

### 4.4 Community Reports & External Normalization (FR-012 – FR-013)

#### FR-012: Fetch & Normalize External Community Reports
- **Category**: Integration / Processing
- **Priority**: P0-Critical
- **Description**: Retrieve crowdsourced crisis reports related to a disaster from an external mock social-media service and normalize them into a uniform schema.
- **Acceptance Criteria**:
  - [ ] Supports `GET /disasters/:id/reports`.
  - [ ] Fetches raw reports from external mock social feed provider.
  - [ ] Transforms disparate raw payloads into standard domain schema: `id`, `disaster_id`, `content`, `author`, `source` (e.g., `social_media`), `sentiment`/`urgency` (optional), and `created_at` (ISO 8601).
  - [ ] Filters reports relevant to the disaster's location/tag context.
- **Dependencies**: FR-003

#### FR-013: External Service Resilience & Circuit Breaking
- **Category**: Integration / Resilience
- **Priority**: P0-Critical
- **Description**: Handle downstream API timeouts, network errors, and upstream 5xx responses gracefully without crashing or hanging client requests.
- **Acceptance Criteria**:
  - [ ] Implements request timeout (maximum 3000ms) on external calls.
  - [ ] If external service fails, falls back to previously cached reports or returns a clean response with `degraded: true` and an informative message.
  - [ ] Never surfaces raw upstream 502/504 errors directly to end users.
- **Dependencies**: FR-012, FR-014

---

### 4.5 Caching & Performance Optimization (FR-014)

#### FR-014: Cache-Aside Implementation for External Feeds
- **Category**: Data & Storage / Performance
- **Priority**: P0-Critical
- **Description**: Implement a Cache-Aside pattern for external feeds (community reports and geocoding queries) to optimize latency and eliminate redundant third-party calls.
- **Acceptance Criteria**:
  - [ ] Flow: Client Request $\rightarrow$ Cache Check $\rightarrow$ (Hit: Return cached payload with header `X-Cache: HIT`) $\rightarrow$ (Miss: Fetch external service $\rightarrow$ Write to cache with TTL $\rightarrow$ Return payload with header `X-Cache: MISS`).
  - [ ] Community reports cache TTL configurable via environment variable (default: 120 seconds).
  - [ ] Geocoding query cache TTL configurable (default: 86400 seconds / 24 hours).
  - [ ] Supports in-memory LRU cache by default, with seamless pluggability for Redis.
- **Dependencies**: FR-008, FR-012

---

### 4.6 Real-Time Updates (FR-015)

#### FR-015: Real-Time Event Dispatch
- **Category**: Realtime
- **Priority**: P0-Critical
- **Description**: Broadcast a real-time event whenever any disaster incident is created or updated, enabling immediate situational awareness for connected clients.
- **Acceptance Criteria**:
  - [ ] Supports real-time connection via WebSocket (Socket.io/ws) or Server-Sent Events (SSE).
  - [ ] Emits `disaster_created` event when a disaster is successfully created.
  - [ ] Emits `disaster_updated` event when a disaster is modified or status changes.
  - [ ] Event payload contains: `event` name, `timestamp`, and the full disaster entity.
  - [ ] Provides a lightweight client verification page/script demonstrating live event reception.
- **Dependencies**: FR-001, FR-004

---

### 4.7 Authentication & Authorization (FR-016 – FR-017)

#### FR-016: Credentialed Password Authentication & System-Enforced Identity
- **Category**: Auth / Security
- **Priority**: P0-Critical
- **Description**: Secure platform mutations and administrative actions with credentialed authentication where user identity and roles are strictly determined and stored by the system in the database.
- **Acceptance Criteria**:
  - [ ] Implements `POST /api/v1/auth/login` accepting `username` and `password`.
  - [ ] Verifies passwords against database `password_hash` using cryptographic `scrypt` hashing with unique 16-byte salts.
  - [ ] Implements `POST /api/v1/auth/register` creating new user accounts in the database; system policy dictates the role (defaults to `CONTRIBUTOR`), preventing clients from elevating their own privileges.
  - [ ] Implements `POST /api/v1/auth/logout` and `GET /api/v1/auth/me` to inspect the verified database profile.
  - [ ] Mints cryptographically signed JWT Bearer tokens containing system-verified `userId`, `username`, and `role`.
  - [ ] Supports machine-to-machine integration using database-verified API keys (`x-api-key`).
  - [ ] Strictly forbids client role self-claiming: client-supplied role headers (e.g., `x-user-role`) without valid tokens are rejected with HTTP 401 Unauthorized.
  - [ ] Returns HTTP 401 Unauthorized if credentials or tokens are invalid, malformed, or expired.
- **Dependencies**: None

#### FR-017: Role-Based Authorization Rules
- **Category**: Auth / Security
- **Priority**: P0-Critical
- **Description**: Enforce hierarchical permissions across all routes based strictly on the user's database-assigned role (`ADMIN`, `CONTRIBUTOR`, `VIEWER`).
- **Acceptance Criteria**:
  - [ ] `ADMIN`: Permitted to Create, Read, Update, and Delete disaster incidents and emergency resources.
  - [ ] `CONTRIBUTOR`: Permitted to Create, Read, and Update disaster incidents and emergency resources; Forbidden from Delete operations (HTTP 403 Forbidden).
  - [ ] `VIEWER` / Unauthenticated: Permitted public Read (`GET`) access on disasters, emergency resources, and normalized reports; Forbidden from mutating state (HTTP 401 Unauthorized if unauthenticated, HTTP 403 Forbidden if authenticated as VIEWER).
  - [ ] All RBAC checks use strongly-typed TypeScript enums (`UserRole`) rather than raw string literals.
- **Dependencies**: FR-001, FR-004, FR-005, FR-016

---

## 5. Non-Functional Requirements (NFRs)

### NFR-001: Response Latency
- **Category**: Performance
- **Priority**: P0-Critical
- **Description**: API endpoints must respond swiftly to support crisis-level throughput.
- **Acceptance Criteria**:
  - [ ] P95 response latency for cached endpoints (`GET /disasters`, `GET /reports`) must be `< 50ms` on local benchmarking.
  - [ ] P95 response latency for geospatial radius calculations (`GET /resources`) must be `< 100ms` for up to 1,000 resources.

### NFR-002: Zero-Friction Developer Setup
- **Category**: Usability / Maintainability
- **Priority**: P0-Critical
- **Description**: The project must run out-of-the-box on a fresh clone with minimal external infrastructure dependencies.
- **Acceptance Criteria**:
  - [ ] Project boots with a single command: `npm install && npm run dev` (or `docker compose up`).
  - [ ] Default configuration uses an embedded database (SQLite via Prisma/Drizzle) and in-memory cache, eliminating the hard requirement for external Redis or PostgreSQL daemons to be running during evaluation.

### NFR-003: Defensive Resilience & Graceful Degradation
- **Category**: Reliability
- **Priority**: P0-Critical
- **Description**: External third-party service degradation must never cause an application-wide crash or uncaught exception.
- **Acceptance Criteria**:
  - [ ] External network timeouts bounded at maximum 3.0 seconds.
  - [ ] If geocoding or social feeds fail, the primary operational flow (incident persistence) succeeds with fallback metadata.

### NFR-004: Data Integrity & Secrets Protection
- **Category**: Security
- **Priority**: P0-Critical
- **Description**: No sensitive credentials, internal paths, or API keys committed to source control.
- **Acceptance Criteria**:
  - [ ] No API keys, credentials, or secrets committed to git.
  - [ ] A complete `.env.example` provided documenting all configuration variables with safe local defaults.
  - [ ] All inputs sanitized against SQL injection and prototype pollution.

### NFR-005: Clean Modular Architecture
- **Category**: Maintainability
- **Priority**: P0-Critical
- **Description**: Strict separation of concerns following domain-driven design principles.
- **Acceptance Criteria**:
  - [ ] Clear layer boundaries: Controllers $\rightarrow$ Services $\rightarrow$ Repositories / Data Access $\rightarrow$ External Adapters.
  - [ ] Business logic isolated from HTTP routing frameworks to enable unit testability.

---

## 6. Technical Constraints

1. **Language & Runtime:** Node.js (TypeScript) or Python (FastAPI). TypeScript is chosen for end-to-end type safety, expressive schema validation, and rich ecosystem support for real-time WebSockets/SSE.
2. **Database Engine:** SQLite (embedded) for friction-free reviewer evaluation, designed with an abstraction layer (Prisma / Drizzle) that can switch to PostgreSQL with a single connection string change.
3. **External Dependencies:** No required paid API keys. All external integrations (Geocoding, Social Media) must have working mock/free implementations.
4. **Timebox:** Delivered within the 24-hour development timeline with zero compromise on core architecture, testing, and documentation.

---

## 7. Conceptual Data Requirements

```
┌───────────────────────┐          1:N          ┌───────────────────────┐
│       Disaster        │───────────────────────│   Community Report    │
├───────────────────────┤                       ├───────────────────────┤
│ id: UUID (PK)         │                       │ id: UUID (PK)         │
│ title: String         │                       │ disaster_id: UUID(FK) │
│ description: Text     │                       │ content: Text         │
│ location_name: String │                       │ author: String        │
│ latitude: Float       │                       │ source: String        │
│ longitude: Float      │                       │ created_at: Timestamp │
│ tags: JSON/Array      │                       └───────────────────────┘
│ status: Enum          │
│ created_by: String    │                       ┌───────────────────────┐
│ created_at: Timestamp │                       │   Emergency Resource  │
│ updated_at: Timestamp │                       ├───────────────────────┤
└───────────────────────┘                       │ id: UUID (PK)         │
                                                │ name: String          │
                                                │ type: Enum            │
                                                │ location_name: String │
                                                │ latitude: Float       │
                                                │ longitude: Float      │
                                                │ capacity: Integer     │
                                                │ status: Enum          │
                                                │ created_at: Timestamp │
                                                └───────────────────────┘
```

### 7.1 Disaster Entity
* `id`: Unique identifier (UUID v4).
* `title`: Short summary (e.g., *"Flash Flood in Lower Manhattan"*).
* `description`: Full incident narrative used for entity extraction.
* `location`: Object containing `name` (string), `latitude` (float), `longitude` (float).
* `tags`: Array of string classifications (e.g., `["flood", "urgent", "evacuation"]`).
* `status`: Incident lifecycle state (`active`, `contained`, `resolved`).
* `created_by`: User identifier or role string.
* `created_at`: UTC timestamp.
* `updated_at`: UTC timestamp.

### 7.2 Resource Entity
* `id`: Unique identifier (UUID v4).
* `name`: Facility or unit name (e.g., *"Bellevue Emergency Triage Clinic"*).
* `type`: Categorical type (`shelter`, `hospital`, `food`, `water`, `rescue`).
* `location`: Object containing `name` (string), `latitude` (float), `longitude` (float).
* `capacity`: Available capacity units (beds, rations, liters).
* `status`: Operational state (`available`, `busy`, `depleted`).
* `created_at`: UTC timestamp.

### 7.3 Community Report Entity
* `id`: Unique identifier (UUID v4 or string).
* `disaster_id`: Associated disaster reference.
* `content`: Text of the report (e.g., *"Clean water tank installed at Central Park South"*).
* `author`: Username or anonymous tag.
* `source`: Upstream platform (e.g., `mock-twitter`, `field-sms`).
* `created_at`: UTC timestamp.

### 7.4 User / Authentication Entity
* `id`: Unique identifier (UUID).
* `username`: Unique user handle (e.g., `admin`, `contributor`, `viewer`).
* `password_hash`: Secure cryptographic scrypt hash with 16-byte random salt (`salt:hash`).
* `role`: System authorization role stored in DB (`ADMIN`, `CONTRIBUTOR`, `VIEWER`).
* `api_key`: Optional machine-to-machine integration key.
* `created_at`: UTC timestamp.

---

## 8. Integration Points

```
┌────────────────────────────────────────────────────────┐
│                        BACKEND                         │
└───────┬───────────────────┬────────────────────┬───────┘
        │                   │                    │
        ▼                   ▼                    ▼
[ Geocoding / NLP ]   [ Social Media Feed ]  [ Cache Layer ]
- Entity extraction   - Mock external API    - In-Memory / Redis
- Nominatim / Fallback- Normalizer pipeline  - Cache-aside with TTL
```

1. **Location Resolution Provider:**
   * *Primary:* OpenStreetMap Nominatim API (free, open, requires `User-Agent` header) or local heuristic extractor.
   * *Secondary / Fallback:* Local geographic dictionary containing high-frequency disaster coordinates (Manhattan, Mumbai, London, San Francisco, Tokyo).
2. **Community Social Feed Provider:**
   * *Primary:* Mock Social Media HTTP endpoint generating structured crowdsourced tweets/posts.
   * *Resilience:* Circuit-breaker wrapper with cached fallback and synthetic report generator when disconnected.
3. **Real-Time Broadcast Channel:**
   * *Mechanism:* WebSocket (Socket.io) or Server-Sent Events (`/api/events`).
   * *Events:* `disaster_created`, `disaster_updated`.

---

## 9. Test Scenarios

### TS-001: Disaster Creation with Automatic Geocoding (Happy Path)
- **Type**: Happy Path
- **Related Requirements**: FR-001, FR-007, FR-008, FR-015
- **Pre-conditions**: System running, authenticated as `contributor`.
- **Steps**:
  1. Send `POST /disasters` with body:
     ```json
     {
       "title": "Severe Flash Flood",
       "description": "Heavy flooding has affected Manhattan, NYC with water rising rapidly.",
       "tags": ["flood", "urgent"]
     }
     ```
  2. Inspect response status code and JSON payload.
  3. Verify WebSocket / real-time listener received event.
- **Expected Result**: HTTP 201 Created. Response contains generated `id`, resolved location (`name`: *"Manhattan, NYC"*, `latitude`: ~40.78, `longitude`: ~-73.96), `status`: *"active"*. Real-time event `disaster_created` received on listener.
- **Pass Criteria**: Status 201, latitude & longitude are valid numbers within Manhattan bounds, event payload matches entity.

### TS-002: Validation & Error Handling on Malformed Input
- **Type**: Validation / Edge Case
- **Related Requirements**: FR-006
- **Pre-conditions**: System running.
- **Steps**:
  1. Send `POST /disasters` with invalid payload:
     ```json
     {
       "title": "A",
       "description": "short"
     }
     ```
- **Expected Result**: HTTP 400 Bad Request.
- **Pass Criteria**: Response body has standard error shape containing specific field validation errors for `title` (too short) and `description` (too short).

### TS-003: Role-Based Authorization & Credential Verification
- **Type**: Security / Authorization
- **Related Requirements**: FR-005, FR-016, FR-017
- **Pre-conditions**: Seed users exist in database (`admin`, `contributor`, `viewer`). Disaster `disaster-123` exists.
- **Steps**:
  1. Send `POST /api/v1/auth/login` with invalid password -> verify HTTP 401 Unauthorized.
  2. Send `POST /api/v1/auth/login` with contributor credentials -> extract signed JWT Bearer token.
  3. Send `DELETE /disasters/disaster-123` with header `Authorization: Bearer <contributor-token>`.
  4. Send `POST /disasters` with header `x-user-role: admin` (without token) to simulate role self-claiming.
  5. Send `POST /api/v1/auth/login` with admin credentials -> extract signed JWT Bearer token.
  6. Send `DELETE /disasters/disaster-123` with header `Authorization: Bearer <admin-token>`.
- **Expected Result**: Step 1 returns 401. Step 3 returns HTTP 403 Forbidden. Step 4 returns HTTP 401 Unauthorized (forged headers rejected). Step 6 returns HTTP 204 No Content.
- **Pass Criteria**: Only verified ADMIN credentials can delete records; role cannot be claimed by request headers.

### TS-004: Geospatial Radius Filtering (Nearby Resources)
- **Type**: Happy Path / Business Rule
- **Related Requirements**: FR-010, FR-011
- **Pre-conditions**: Seed resources loaded (including Manhattan resources at 2 km and Brooklyn resources at 15 km). Disaster created in Manhattan.
- **Steps**:
  1. Send `GET /disasters/:id/resources?radius=5`.
  2. Inspect returned resource array and distance values.
  3. Send `GET /disasters/:id/resources?radius=25`.
  4. Inspect returned resource array.
- **Expected Result**: Query with `radius=5` returns only Manhattan resources within 5 km. Query with `radius=25` returns both Manhattan and Brooklyn resources. All results sorted by ascending distance.
- **Pass Criteria**: All returned items have `distance_km <= radius` and are ordered from nearest to farthest.

### TS-005: Cache-Aside Hit/Miss for External Reports
- **Type**: Integration / Caching
- **Related Requirements**: FR-012, FR-014
- **Pre-conditions**: Disaster `:id` exists, cache is initially empty.
- **Steps**:
  1. Send `GET /disasters/:id/reports`. Inspect response header `X-Cache`.
  2. Immediately send second `GET /disasters/:id/reports`. Inspect response header `X-Cache`.
- **Expected Result**: First call returns `X-Cache: MISS`. Second call returns `X-Cache: HIT` with identical normalized payload in `< 20ms`.
- **Pass Criteria**: Header transitions from `MISS` to `HIT`, sub-50ms latency on hit.

### TS-006: External Service Outage Fallback
- **Type**: Resilience / Failure
- **Related Requirements**: FR-008, FR-013, NFR-003
- **Pre-conditions**: External mock social feed or geocoder configured to simulate HTTP 500 error or network timeout.
- **Steps**:
  1. Send `POST /disasters` with location description while geocoding network is simulated down.
  2. Send `GET /disasters/:id/reports` while external social service is down.
- **Expected Result**: Disaster creation succeeds using fallback coordinates; reports endpoint returns degraded empty array or cached baseline with HTTP 200 rather than crashing.
- **Pass Criteria**: Zero 500 crashes; system degrades gracefully.

---

## 10. Open Technical Decisions & Trade-offs

| Decision | Option Selected | Trade-off / Rationale |
| :------- | :-------------- | :-------------------- |
| **Database Engine** | SQLite (via ORM/SQL query layer) with PostgreSQL compatibility | **Zero-Friction Review:** Allows the founder/reviewer to run `npm run dev` instantly without installing Docker or PostgreSQL locally, while keeping the schema portable to Postgres via standard SQL. |
| **Geospatial Calculation** | Mathematical Haversine Great-Circle Formula in Service Layer | **Portability vs Native PostGIS:** Native PostGIS requires PostgreSQL extensions. The Haversine formula implemented cleanly provides identical spherical accuracy ($\pm 0.5\%$) with zero external dependencies and runs in $< 5\mu s$ per calculation. |
| **Caching Engine** | In-Memory LRU with Redis adapter pluggability | **Local Speed vs Distributed Cache:** In-memory LRU cache works without running a Redis container locally, fulfilling the assignment's caching requirement while providing an environment variable toggle for Redis in production. |
| **Real-Time Protocol** | Server-Sent Events (SSE) or Socket.io | **Lightweight Simplicity:** SSE delivers push updates over standard HTTP without WebSocket handshake complexities or proxy buffering issues, though Socket.io will be supported if bidirectional messaging is desired. |

---

## 11. Glossary

* **Cache-Aside:** An architectural caching pattern where the application code first queries the cache; if not found (miss), it fetches from the external source, writes to the cache with a TTL, and returns the result.
* **Haversine Formula:** An equation giving great-circle distances between two points on a sphere from their longitudes and latitudes.
* **Nominatim:** An open-source search engine for OpenStreetMap data that provides forward and reverse geocoding.
* **RBAC:** Role-Based Access Control, an approach to restricting system access to authorized users based on predefined roles (`admin`, `contributor`, `viewer`).
* **TTL (Time-To-Live):** The lifespan of cached data before it is marked expired and purged.
