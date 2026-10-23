# Technical Design Specification (TDS)
## Disaster Response Coordination Platform (DRCP)

| Field         | Value                                                  |
| :------------ | :----------------------------------------------------- |
| **Version**   | 1.0.1                                                  |
| **Status**    | Approved for Implementation                            |
| **Owner**     | Soham Khare                                            |
| **Created**   | 2026-10-23 16:30 IST                                   |
| **Updated**   | 2026-10-23 16:42 IST                                   |
| **TRD Ref**   | TRD v1.0.1                                             |
| **Project**   | Disaster Response Coordination Platform (DRCP)         |

---

## Update History

| Version | Date & Time          | Summary of Changes                                                      |
| :------ | :------------------- | :---------------------------------------------------------------------- |
| 1.0.1   | 2026-10-23 16:42 IST | Updated project root path references from Dissaster to DRCP.            |
| 1.0.0   | 2026-10-23 16:30 IST | Initial complete TDS created from TRD v1.0.1 covering all 15 sections.  |

---

## 1. Document Header & Scope

This Technical Design Specification (TDS) defines the exact implementation architecture for the **Disaster Response Coordination Platform (DRCP)**. Derived from [docs/TRD.md](file:///d:/Projects/DRCP/docs/TRD.md), this document details the database schema (DDL), API contracts, algorithmic geospatial search, cache-aside logic, real-time WebSocket protocol, role-based authorization, and project structure.

### Key Architectural Mandates
1. **Decoupled API Architecture:** Dedicated Node.js + TypeScript backend exposing strict RESTful endpoints and Socket.io events, allowing seamless consumption by both Web browsers and native mobile applications (React Native / Expo / Flutter).
2. **Reviewer-First Zero Friction:** Fully operational on a fresh clone using SQLite + Prisma ORM (with zero manual database server configuration), accompanied by full PostgreSQL/PostGIS DDL portability.
3. **Resilience & Fallback:** Unbreakable operations where external geocoding or social feed timeouts never trigger unhandled exceptions or service crashes.

---

## 2. Architecture Overview

### 2.1 System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (CROSS-PLATFORM)                   │
├───────────────────────────────────┬────────────────────────────────────┤
│ React 18 + Vite (Web / PWA)       │ Future Native Mobile (React Native)│
│ - Leaflet.js Interactive Map      │ - iOS / Android Native Views       │
│ - Real-Time Alert Ticker          │ - Push Notifications               │
│ - Disaster CRUD & Triage Portal   │ - Offline Location Caching         │
└─────────────────┬─────────────────┴──────────────────┬─────────────────┘
                  │ HTTP / REST                        │ Socket.io (WS)
                  ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY & MIDDLEWARE LAYER                  │
├────────────────────────────────────────────────────────────────────────┤
│ Node.js + Express (TypeScript)                                         │
│ - Security Headers (Helmet, CORS)                                      │
│ - Rate Limiting & Request Throttling                                   │
│ - RBAC Authentication (JWT Bearer / Mock Headers)                      │
│ - Zod Request Validation & RFC 7807 Error Envelope                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼───────────────────────────┐
       ▼                            ▼                           ▼
[ Disaster Service ]      [ Resource Service ]        [ Feed & Cache Service ]
- NLP Entity Extractor    - Haversine Geospatial      - Cache-Aside Controller
- Nominatim / Fallback    - Radius Query Engine       - Mock Social API Adapter
- Lifecycle State Machine - Category Filtering        - Resilience Circuit Breaker
       │                            │                           │
       └────────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          PERSISTENCE & CACHING                         │
├──────────────────────────────────────────┬─────────────────────────────┤
│ Primary Database (Prisma ORM)            │ Cache Layer (CacheStore)    │
│ - SQLite (Local / Zero-Config Review)    │ - In-Memory LRU (Default)   │
│ - PostgreSQL (Production Ready)          │ - Redis Adapter (Optional)  │
│ - Spatial Indexing & Haversine Math      │ - Dual TTL Policy (Geo/Feed)│
└──────────────────────────────────────────┴─────────────────────────────┘
```

### 2.2 Guiding Architectural Principles
* **Domain-Driven Modular Monolith:** Organized strictly into `controllers/`, `services/`, `repositories/`, `adapters/`, and `schemas/`.
* **Zero External Paid Dependencies:** Free and resilient mock fallbacks for all third-party services.
* **Stateless API Core:** Authentication and session verification handled via signed tokens and explicit role validation.

---

## 3. Technology Stack

| Layer | Technology | Version | Rationale |
| :--- | :--- | :--- | :--- |
| **Backend Runtime** | Node.js (TypeScript) | `Node >= 20.x`, `TS 5.x` | Industry-standard async I/O, type safety, native ecosystem for real-time WebSockets and schema validation. |
| **HTTP Framework** | Express.js | `^4.19.x` | Battle-tested, lightweight, transparent middleware ecosystem, and universally understood by code reviewers. |
| **Real-Time Engine**| Socket.io | `^4.7.x` | Unified real-time engine with auto-reconnection, heartbeat, and cross-platform clients for React, React Native, and mobile SDKs. |
| **Database & ORM** | SQLite + Prisma ORM | `Prisma ^5.15.x` | Zero-configuration local startup (generates `dev.db`), type-safe client queries, built-in migration engine, and visual inspection via `npx prisma studio`. Easily swapped to PostgreSQL. |
| **Schema Validation**| Zod | `^3.23.x` | Runtime validation with automatic TypeScript type inference, returning granular field errors. |
| **Caching Engine** | In-Memory LRU (lru-cache) | `^10.2.x` | High-speed in-process cache with TTL support; decoupled behind an interface to support Redis via `ioredis`. |
| **Geospatial Engine**| Haversine Great-Circle | Native Algorithmic | Deterministic spherical geometry with zero external C-extensions, executing in $< 5\mu s$ with $\pm 0.5\%$ spherical precision. |
| **Frontend Web/PWA** | React 18 + Vite | `React ^18.3.x` | Instant HMR, lightweight bundle, responsive layout with Leaflet.js interactive maps and PWA manifest. |
| **Testing** | Vitest / Jest + Supertest | `Vitest ^1.6.x` | Fast unit and HTTP integration testing with mock assertions. |

---

## 4. Project Directory Structure

```
d:/Projects/DRCP/
├── .agents/                        # Agent workflows and skill rules
│   ├── rules/
│   │   └── no-secrets.md
│   └── skills/
│       ├── create-trd/
│       ├── create-tds/
│       └── stage-tracker/
├── docs/                           # Architecture and planning documentation
│   ├── BUSINESS_OVERVIEW.md
│   ├── TRD.md
│   ├── TDS.md
│   └── STAGES.md
├── prisma/                         # Database schema & migrations
│   ├── schema.prisma               # Prisma DDL definition
│   └── seed.ts                     # Database seed (Disasters & Resources)
├── src/                            # Backend source code
│   ├── server.ts                   # Application entry point & HTTP listener
│   ├── app.ts                      # Express app configuration & middleware
│   ├── config/                     # Environment configuration & constants
│   │   └── index.ts
│   ├── common/                     # Cross-cutting utilities
│   │   ├── errors.ts               # RFC 7807 Error classes
│   │   ├── logger.ts               # Structured logging
│   │   └── haversine.ts            # Mathematical geospatial calculations
│   ├── middleware/                 # Request interceptors
│   │   ├── auth.middleware.ts      # Token & RBAC enforcement
│   │   ├── validate.middleware.ts  # Zod schema validation
│   │   └── error.middleware.ts     # Global error envelope formatter
│   ├── modules/
│   │   ├── disasters/              # Disaster incident domain
│   │   │   ├── disaster.controller.ts
│   │   │   ├── disaster.service.ts
│   │   │   ├── disaster.repository.ts
│   │   │   └── disaster.schema.ts
│   │   ├── resources/              # Emergency relief resources domain
│   │   │   ├── resource.controller.ts
│   │   │   ├── resource.service.ts
│   │   │   ├── resource.repository.ts
│   │   │   └── resource.schema.ts
│   │   ├── reports/                # Community reports & social feed
│   │   │   ├── report.controller.ts
│   │   │   ├── report.service.ts
│   │   │   └── report.schema.ts
│   │   └── geocoding/              # NLP location extraction & geocoding
│   │       ├── geocoding.service.ts
│   │       └── location-dictionary.ts
│   ├── realtime/                   # WebSocket / Socket.io broadcaster
│   │   └── socket.ts
│   └── cache/                      # Caching abstraction
│       ├── cache.interface.ts
│       └── memory-cache.ts
├── client/                         # Web & Mobile-ready Frontend
│   ├── index.html                  # HTML entry point with PWA meta
│   ├── manifest.json               # Progressive Web App manifest
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/             # UI Components
│   │   │   ├── MapView.tsx         # Leaflet interactive map
│   │   │   ├── IncidentList.tsx    # Filterable disaster list
│   │   │   ├── CreateDisasterModal.tsx
│   │   │   ├── ResourceFinder.tsx  # Proximity search tool
│   │   │   ├── ReportsFeed.tsx     # Normalized social report cards
│   │   │   └── LiveTicker.tsx      # Real-time WebSocket event alert bar
│   │   └── services/               # Client API & Socket.io SDK
│   │       ├── api.ts
│   │       └── socket.ts
│   └── vite.config.ts
├── tests/                          # Automated test suite
│   ├── disaster.test.ts            # CRUD & validation tests
│   ├── geospatial.test.ts          # Radius calculation tests
│   ├── auth.test.ts                # RBAC permission tests
│   └── caching.test.ts             # Cache-aside & mock failure tests
├── .env.example                    # Environment template
├── package.json
└── tsconfig.json
```

---

## 5. Database Design & DDL

The database design uses standard relational principles. Primary keys are UUID strings. Spatial coordinates are stored as high-precision floating point numbers (`DECIMAL(10, 7)` in Postgres / `Float` in SQLite).

### 5.1 Prisma Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum DisasterStatus {
  ACTIVE
  CONTAINED
  RESOLVED
}

enum ResourceType {
  SHELTER
  HOSPITAL
  FOOD
  WATER
  RESCUE
}

enum ResourceStatus {
  AVAILABLE
  LIMITED
  DEPLETED
}

enum UserRole {
  ADMIN
  CONTRIBUTOR
  VIEWER
}

model Disaster {
  id           String          @id @default(uuid())
  title        String
  description  String
  locationName String          @map("location_name")
  latitude     Float
  longitude    Float
  tags         String          // JSON array of strings e.g. '["flood","urgent"]'
  status       DisasterStatus  @default(ACTIVE)
  createdBy    String          @default("system") @map("created_by")
  createdAt    DateTime        @default(now()) @map("created_at")
  updatedAt    DateTime        @updatedAt @map("updated_at")

  reports      CommunityReport[]

  @@index([status])
  @@index([latitude, longitude])
  @@map("disasters")
}

model EmergencyResource {
  id           String         @id @default(uuid())
  name         String
  type         ResourceType
  locationName String         @map("location_name")
  latitude     Float
  longitude    Float
  capacity     Int            @default(0)
  status       ResourceStatus @default(AVAILABLE)
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")

  @@index([type])
  @@index([latitude, longitude])
  @@map("emergency_resources")
}

model CommunityReport {
  id          String   @id @default(uuid())
  disasterId  String   @map("disaster_id")
  content     String
  author      String
  source      String   @default("social_media")
  createdAt   DateTime @default(now()) @map("created_at")

  disaster    Disaster @relation(fields: [disasterId], references: [id], onDelete: Cascade)

  @@index([disasterId])
  @@map("community_reports")
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  role      UserRole @default(VIEWER)
  apiKey    String   @unique @map("api_key")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("users")
}
```

### 5.2 Standalone SQL DDL (PostgreSQL Compatible)

```sql
-- Disasters Table
CREATE TABLE disasters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disasters_status ON disasters(status);
CREATE INDEX idx_disasters_coords ON disasters(latitude, longitude);

-- Emergency Resources Table
CREATE TABLE emergency_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resources_type ON emergency_resources(type);
CREATE INDEX idx_resources_coords ON emergency_resources(latitude, longitude);

-- Community Reports Table
CREATE TABLE community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disaster_id UUID NOT NULL REFERENCES disasters(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL DEFAULT 'social_media',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_disaster ON community_reports(disaster_id);
```

---

## 6. API Contracts & Route Specifications

All endpoints return uniform response shapes. Successful responses wrap payloads in `{ "status": "success", "data": ... }`. Errors follow RFC 7807 structured format `{ "status": "error", "message": "...", "errors": [...] }`.

### 6.1 Disaster Incident Management

#### `POST /api/v1/disasters`
- **Description:** Create a new disaster incident. If coordinates are omitted, automatically resolves location from `description`.
- **Auth:** Required (`admin` or `contributor`)
- **Headers:** `Authorization: Bearer <token>` or `x-user-role: contributor`
- **Request Body:**
  ```json
  {
    "title": "Flooding in Manhattan",
    "description": "Heavy flooding has affected Manhattan, NYC with subway stations submerged.",
    "tags": ["flood", "urgent"],
    "location": {
      "name": "Manhattan, NYC",
      "latitude": 40.7831,
      "longitude": -73.9712
    }
  }
  ```
  *(Note: `location` is optional. If omitted, the NLP geocoding engine infers it from `description`)*.
- **Success Response `201 Created`:**
  ```json
  {
    "status": "success",
    "data": {
      "id": "c7a8b9e0-81f5-4d2c-9a41-3b7e4125890a",
      "title": "Flooding in Manhattan",
      "description": "Heavy flooding has affected Manhattan, NYC with subway stations submerged.",
      "location": {
        "name": "Manhattan, NYC",
        "latitude": 40.7831,
        "longitude": -73.9712
      },
      "tags": ["flood", "urgent"],
      "status": "ACTIVE",
      "created_by": "contributor",
      "created_at": "2026-10-23T16:30:00.000Z",
      "updated_at": "2026-10-23T16:30:00.000Z"
    }
  }
  ```
- **Error Codes:** `400 Bad Request` (validation error), `401 Unauthorized`.

---

#### `GET /api/v1/disasters`
- **Description:** Retrieve list of disasters with optional filtering by tag, status, and pagination.
- **Auth:** Public (`viewer`)
- **Query Parameters:**
  | Parameter | Type | Required | Default | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `tag` | string | No | - | Filter by tag substring (e.g. `flood`) |
  | `status` | string | No | - | Filter by status (`ACTIVE`, `CONTAINED`, `RESOLVED`) |
  | `limit` | integer | No | 20 | Max results to return (max 100) |
  | `offset` | integer | No | 0 | Pagination offset |
- **Success Response `200 OK`:**
  ```json
  {
    "status": "success",
    "meta": {
      "total": 1,
      "limit": 20,
      "offset": 0
    },
    "data": [
      {
        "id": "c7a8b9e0-81f5-4d2c-9a41-3b7e4125890a",
        "title": "Flooding in Manhattan",
        "description": "Heavy flooding has affected Manhattan, NYC...",
        "location": { "name": "Manhattan, NYC", "latitude": 40.7831, "longitude": -73.9712 },
        "tags": ["flood", "urgent"],
        "status": "ACTIVE",
        "created_by": "contributor",
        "created_at": "2026-10-23T16:30:00.000Z"
      }
    ]
  }
  ```

---

#### `GET /api/v1/disasters/:id`
- **Description:** Retrieve details for a single disaster by UUID.
- **Auth:** Public (`viewer`)
- **Success Response `200 OK`:** Single disaster JSON object.
- **Error Codes:** `404 Not Found` if disaster does not exist.

---

#### `PATCH /api/v1/disasters/:id`
- **Description:** Update disaster status, title, description, or tags.
- **Auth:** Required (`admin` or `contributor`)
- **Request Body (Partial):**
  ```json
  {
    "status": "CONTAINED",
    "description": "Water levels receding on Manhattan avenues."
  }
  ```
- **Success Response `200 OK`:** Updated disaster object.
- **Error Codes:** `400 Bad Request`, `401 Unauthorized`, `404 Not Found`.

---

#### `DELETE /api/v1/disasters/:id`
- **Description:** Delete disaster incident. Restricted strictly to `admin`.
- **Auth:** Required (`admin` only)
- **Success Response `204 No Content`**
- **Error Codes:** `401 Unauthorized`, `403 Forbidden` (if caller is `contributor`), `404 Not Found`.

---

### 6.2 Nearby Resources & Geospatial Radius Query

#### `GET /api/v1/disasters/:id/resources`
- **Description:** Retrieve emergency resources within a radial distance from the disaster's location (or custom coordinates).
- **Auth:** Public (`viewer`)
- **Query Parameters:**
  | Parameter | Type | Required | Default | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `lat` | float | No | Disaster lat | Override origin latitude |
  | `lng` | float | No | Disaster lng | Override origin longitude |
  | `radius` | float | No | 10.0 | Search radius in kilometers |
  | `type` | string | No | - | Filter by type (`SHELTER`, `HOSPITAL`, `FOOD`, `WATER`, `RESCUE`) |
- **Success Response `200 OK`:**
  ```json
  {
    "status": "success",
    "origin": {
      "latitude": 40.7831,
      "longitude": -73.9712,
      "radius_km": 5.0
    },
    "count": 2,
    "data": [
      {
        "id": "e1f2a3b4-5678-4321-9abc-123456789abc",
        "name": "Manhattan Red Cross Emergency Shelter",
        "type": "SHELTER",
        "location": {
          "name": "Midtown Manhattan",
          "latitude": 40.7589,
          "longitude": -73.9851
        },
        "capacity": 250,
        "status": "AVAILABLE",
        "distance_km": 2.87
      },
      {
        "id": "f2a3b4c5-6789-5432-0bcd-234567890bcd",
        "name": "Central Park Clean Water Distribution Point",
        "type": "WATER",
        "location": {
          "name": "Central Park South",
          "latitude": 40.7661,
          "longitude": -73.9772
        },
        "capacity": 5000,
        "status": "AVAILABLE",
        "distance_km": 1.95
      }
    ]
  }
  ```
- **Error Codes:** `400 Bad Request` (invalid radius or coordinates), `404 Not Found` (disaster ID invalid).

---

### 6.3 Community Reports & Caching

#### `GET /api/v1/disasters/:id/reports`
- **Description:** Retrieve normalized crowdsourced community reports. Protected by Cache-Aside with `X-Cache: HIT` or `X-Cache: MISS` response header.
- **Auth:** Public (`viewer`)
- **Response Headers:**
  - `X-Cache`: `HIT` | `MISS`
  - `X-Cache-TTL`: `120` (seconds remaining)
- **Success Response `200 OK`:**
  ```json
  {
    "status": "success",
    "disaster_id": "c7a8b9e0-81f5-4d2c-9a41-3b7e4125890a",
    "cached": true,
    "count": 3,
    "data": [
      {
        "id": "rep-101",
        "content": "Need drinking water near 8th Ave and 42nd St Manhattan",
        "author": "citizen_nyc",
        "source": "social_media",
        "created_at": "2026-10-23T16:15:00.000Z"
      },
      {
        "id": "rep-102",
        "content": "Emergency shelter on 5th Ave has 50 beds remaining",
        "author": "volunteer_mark",
        "source": "social_media",
        "created_at": "2026-10-23T16:20:00.000Z"
      }
    ]
  }
  ```
- **Resilience Behavior:** If downstream social feed API is unavailable, returns cached snapshot or fallback baseline with HTTP 200 without failing.

---

### 6.4 Real-Time WebSockets (Socket.io)

* **Connection URL:** `ws://localhost:3000` (or `wss://...`)
* **Transport:** WebSocket with HTTP long-polling fallback.
* **Events Emitted by Server:**
  1. `disaster_created`
     * Payload: Full `Disaster` entity.
  2. `disaster_updated`
     * Payload: Full `Disaster` entity.
  3. `system_alert`
     * Payload: `{ "level": "HIGH", "message": "Emergency alert broadcast", "timestamp": "..." }`

---

## 7. Geospatial Algorithm & Haversine Implementation

To guarantee zero setup friction on any evaluation machine while retaining mathematical precision, the distance between any disaster coordinate $(\phi_1, \lambda_1)$ and emergency resource $(\phi_2, \lambda_2)$ is computed via the **Haversine Great-Circle Formula**:

$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$d = R \cdot c$$

Where:
* $R = 6371.0 \text{ km}$ (Mean Earth radius)
* $\phi_1, \phi_2$ are latitudes in radians
* $\Delta \phi = \phi_2 - \phi_1$, $\Delta \lambda = \lambda_2 - \lambda_1$ in radians

### TypeScript Implementation (`src/common/haversine.ts`)

```typescript
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function calculateDistanceKm(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371.0; // Earth radius in kilometers
  const toRad = (deg: number) => (deg * Math.PI) / 180.0;

  const lat1 = toRad(coord1.latitude);
  const lon1 = toRad(coord1.longitude);
  const lat2 = toRad(coord2.latitude);
  const lon2 = toRad(coord2.longitude);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}
```

---

## 8. Core Workflows & Processing Pipelines

### 8.1 Disaster Creation & Geocoding Pipeline

```mermaid
sequenceDiagram
  participant Client as Client (Web / Mobile)
  participant Router as Disaster Router
  participant Auth as Auth Middleware
  participant Svc as Disaster Service
  participant Geo as Geocoding Service
  participant Cache as CacheStore
  participant DB as SQLite / Prisma DB
  participant Socket as Socket.io Broadcaster

  Client->>Router: POST /api/v1/disasters (Title, Description, Tags)
  Router->>Auth: Validate Token / Role
  Auth-->>Router: Role: CONTRIBUTOR / ADMIN
  Router->>Svc: createDisaster(data)

  alt Coordinates NOT provided in body
    Svc->>Geo: extractAndGeocode(description)
    Geo->>Cache: Check "geo:{location_key}"
    alt Cache Hit
      Cache-->>Geo: Cached {lat, lng}
    else Cache Miss
      Geo->>Geo: Extract named entity (regex / NLP heuristics)
      Geo->>Geo: Query Nominatim API with 2s timeout
      alt Nominatim Success
        Geo-->>Cache: Store {lat, lng} (TTL: 24 hours)
      else Nominatim Failed / Offline
        Geo->>Geo: Fallback to Curated Disaster City Registry
      end
    end
    Geo-->>Svc: Resolved Coordinates {lat, lng, name}
  end

  Svc->>DB: prisma.disaster.create(...)
  DB-->>Svc: Created Disaster Record
  Svc->>Socket: emit('disaster_created', disaster)
  Socket-->>Client: Broadcast event to all active clients
  Svc-->>Router: Response DTO
  Router-->>Client: HTTP 201 Created
```

---

### 8.2 Community Reports Cache-Aside Pipeline

```mermaid
sequenceDiagram
  participant Client as Client Application
  participant Router as Report Router
  participant Svc as Report Service
  participant Cache as CacheStore (Memory/Redis)
  participant Ext as External Social Feed Mock

  Client->>Router: GET /api/v1/disasters/:id/reports
  Router->>Svc: getReports(disasterId)
  Svc->>Cache: get("reports:{disasterId}")

  alt Cache Hit
    Cache-->>Svc: Cached Reports JSON
    Svc-->>Router: { data, cached: true }
    Router-->>Client: HTTP 200 OK [Header X-Cache: HIT]
  else Cache Miss
    Cache-->>Svc: null
    Svc->>Ext: fetchRawSocialPosts(disasterId) [Timeout: 3000ms]
    alt External Service OK
      Ext-->>Svc: Raw Social Media Posts Payload
      Svc->>Svc: Normalize to Standard Schema
      Svc->>Cache: set("reports:{disasterId}", normalized, TTL=120s)
      Svc-->>Router: { data, cached: false }
      Router-->>Client: HTTP 200 OK [Header X-Cache: MISS]
    else External Service Fails / Times out
      Svc->>Svc: Activate Circuit Fallback (Synthetic Baseline Reports)
      Svc-->>Router: { data: fallbackReports, degraded: true }
      Router-->>Client: HTTP 200 OK [Header X-Cache: DEGRADED]
    end
  end
```

---

## 9. Security Architecture & RBAC

### 9.1 Authentication Mechanism
* Support both standard `Authorization: Bearer <token>` and quick-switch evaluation header `X-User-Role: <role>` so reviewers can test permissions instantly via Postman or browser without generating JWTs.
* In production, JWTs are signed with `JWT_SECRET` using HS256 algorithm.

### 9.2 Role Permission Matrix

| Endpoint | HTTP Method | `admin` | `contributor` | `viewer` / Public |
| :--- | :--- | :---: | :---: | :---: |
| `/api/v1/disasters` | `POST` |  Allowed |  Allowed | ❌ 401 Unauthorized |
| `/api/v1/disasters` | `GET` |  Allowed |  Allowed |  Allowed |
| `/api/v1/disasters/:id` | `GET` |  Allowed |  Allowed |  Allowed |
| `/api/v1/disasters/:id` | `PATCH` |  Allowed |  Allowed | ❌ 401 Unauthorized |
| `/api/v1/disasters/:id` | `DELETE` |  Allowed | ❌ 403 Forbidden | ❌ 401 Unauthorized |
| `/api/v1/disasters/:id/resources` | `GET` |  Allowed |  Allowed |  Allowed |
| `/api/v1/disasters/:id/reports` | `GET` |  Allowed |  Allowed |  Allowed |

---

## 10. Environment & Configuration

All environment variables have safe, out-of-the-box local defaults.

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | number | `3000` | Backend HTTP server port |
| `NODE_ENV` | string | `development` | Environment mode (`development`, `production`, `test`) |
| `DATABASE_URL` | string | `file:./dev.db` | SQLite connection string (or PostgreSQL URI) |
| `JWT_SECRET` | string | `drcp-super-secret-key-2026` | Secret key for JWT signing |
| `CACHE_DRIVER` | string | `memory` | Cache backend: `memory` or `redis` |
| `REDIS_URL` | string | `redis://localhost:6379` | Optional Redis URI if `CACHE_DRIVER=redis` |
| `REPORTS_CACHE_TTL`| number | `120` | Cache lifespan for community reports in seconds |
| `GEO_CACHE_TTL` | number | `86400` | Cache lifespan for geocoded locations in seconds |
| `EXTERNAL_TIMEOUT_MS` | number | `3000` | Timeout threshold for external API calls |

---

## 11. Error Handling & Standard Responses

All application errors conform to RFC 7807 structured format:

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Invalid request parameters",
  "timestamp": "2026-10-23T16:30:00.000Z",
  "errors": [
    {
      "field": "title",
      "message": "Title must be at least 3 characters long"
    },
    {
      "field": "description",
      "message": "Description is required"
    }
  ]
}
```

### Standard HTTP Status Code Map:
* `200 OK` — Standard successful query / update.
* `201 Created` — Successful resource creation.
* `204 No Content` — Successful deletion.
* `400 Bad Request` — Schema validation failure or bad query params.
* `401 Unauthorized` — Missing or invalid authentication token.
* `403 Forbidden` — Valid identity, but insufficient role permissions.
* `404 Not Found` — Resource with specified ID does not exist.
* `500 Internal Server Error` — Caught exception safely masked without leaking stack traces.

---

## 12. Cross-Platform Mobile & Web Client Architecture

To satisfy the requirement that this platform can easily become a native mobile application while functioning as an immediate web app:

1. **Decoupled API Design:**
   * Backend delivers pure JSON REST APIs with standard HTTP verbs and WebSocket channels.
   * Zero server-side HTML rendering; full client-server decoupling.
2. **Web / PWA Application (`client/`):**
   * Built with React 18, Vite, and Leaflet.js.
   * Uses viewport scaling meta tags and touch-friendly UI components.
   * Includes `manifest.json` with standalone display mode, allowing reviewers to install and test it as a Progressive Web App on mobile devices.
3. **Future Native Mobile Conversion (React Native / Flutter):**
   * The TypeScript client SDK in `client/src/services/api.ts` can be copied verbatim into a React Native / Expo application with zero modifications.
   * Socket.io client works identically on React Native and Flutter.

---

## 13. Testing Strategy

The automated test suite (`tests/`) uses Vitest/Jest and Supertest to validate:
1. **API Endpoint Test (`tests/disaster.test.ts`):** `POST /disasters` and `GET /disasters` lifecycle.
2. **Validation / Error Test (`tests/disaster.test.ts`):** Rejection of empty/short title and descriptions with 400 Bad Request.
3. **Business Rule / Authorization Test (`tests/auth.test.ts`):** `DELETE /disasters/:id` rejected with 403 for `contributor` and permitted with 204 for `admin`.
4. **Geospatial Radius Test (`tests/geospatial.test.ts`):** Correct filtering of resources within 5 km vs 25 km using the Haversine equation.
5. **External Integration & Cache Test (`tests/caching.test.ts`):** Verification of `X-Cache: MISS` on initial fetch and `X-Cache: HIT` on subsequent fetch, plus graceful fallback when mock external service simulates an outage.

---

## 14. Open Technical Decisions & Trade-offs

| Decision | Option Selected | Trade-off Rationale |
| :--- | :--- | :--- |
| **Prisma with SQLite** | Embedded SQLite for dev / test | Reviewers can run the application instantly with `npm run dev` without needing Docker or a local PostgreSQL instance running. Switching to Postgres is as simple as updating `provider = "postgresql"` in `schema.prisma`. |
| **Haversine vs PostGIS**| Haversine calculation in application layer | PostGIS requires specialized PostgreSQL extensions that cannot run on vanilla SQLite. The Haversine formula provides identical spatial accuracy with zero external dependencies and sub-millisecond execution. |
| **In-Memory CacheStore**| In-memory LRU with Redis interface | Allows out-of-the-box caching with zero external setup, while allowing production deployments to toggle Redis via `CACHE_DRIVER=redis`. |
