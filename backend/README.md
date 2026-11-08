# Edito Express.js Backend Service

A high-performance, decoupled Express.js backend for the **Edito Browser Studio** media platform, built strictly in JavaScript (ES Modules).

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Default configuration:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=edito_super_secure_jwt_secret_key_2026_change_in_production
ADMIN_EMAIL=admin@edito.studio
ADMIN_PASSWORD=adminedito2026
IP_SALT=edito_dynamic_salt_change_weekly
```

### 3. Start the Server
- **Development (hot reload):**
  ```bash
  npm run dev
  ```
- **Production:**
  ```bash
  npm start
  ```
- **Run automated test suite:**
  ```bash
  node test.js
  ```

---

## 📁 Architecture & Folder Structure

```text
backend/
├─ package.json              # Express, helmet, cors, morgan, jsonwebtoken, dotenv
├─ .env                      # Local environment configuration
├─ .env.example              # Template config
├─ server.js                 # Express app initialization, COOP/COEP headers, middleware
├─ test.js                   # Automated end-to-end API verification suite
└─ src/
   ├─ config/
   │  └─ env.js              # Environment variable loader
   ├─ middleware/
   │  ├─ anonymize.js        # IP hashing, masking (103.xxx.xxx.xxx), geo header parsing
   │  ├─ auth.js             # JWT bearer verification & admin role guard
   │  ├─ rateLimiter.js      # Sliding-window in-memory rate limiting
   │  └─ errorHandler.js     # Standardized JSON error response envelope
   ├─ routes/
   │  ├─ auth.routes.js      # /api/v1/auth/*
   │  ├─ projects.routes.js  # /api/v1/projects/*
   │  ├─ shares.routes.js    # /api/v1/shares/*
   │  ├─ events.routes.js    # /api/v1/events
   │  ├─ feedback.routes.js  # /api/v1/feedback
   │  ├─ models.routes.js    # /api/v1/models/manifest
   │  └─ admin.routes.js     # /api/v1/admin/*
   ├─ controllers/
   │  ├─ auth.controller.js
   │  ├─ projects.controller.js
   │  ├─ shares.controller.js
   │  ├─ events.controller.js
   │  ├─ feedback.controller.js
   │  ├─ models.controller.js
   │  └─ admin.controller.js
   └─ services/
      ├─ store.js            # In-memory store with seeded telemetry, KPIs & models
      └─ retention.js        # Daily background purge worker (90-day retention)
```

---

## 📡 API Reference (`/api/v1`)

All endpoints return JSON responses using the standard error envelope `{ error: { code, message } }` on failure.

### 1. Health & Models
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/health` | None | Service status and uptime |
| `GET` | `/api/v1/models/manifest` | None | Listing of ONNX / WASM model URLs, sizes & hashes |

### 2. Telemetry & User Interactions
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/events` | None | Ingest anonymous usage events (IP masked & hashed) |
| `POST` | `/api/v1/feedback` | None | Submit user feedback with device specs |
| `POST` | `/api/v1/feedback/report` | None | Report abuse or copyright violation on shared link |

### 3. Authentication & Cloud Projects
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/auth/login` | None | Authenticate user or admin, returns JWT token |
| `GET` | `/api/v1/auth/me` | Bearer | Get profile of currently logged-in user |
| `GET` | `/api/v1/projects` | Bearer | List saved projects for the authenticated user |
| `POST` | `/api/v1/projects` | Bearer | Save or update a project state |
| `DELETE`| `/api/v1/projects/:id` | Bearer | Delete a saved project |

### 4. Shares & Public Links
| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/shares` | Optional | Generate unguessable public/unlisted share token |
| `GET` | `/api/v1/shares/:token` | None | Resolve a shared mix or project by token |
| `DELETE`| `/api/v1/shares/:token` | Bearer | Revoke a share link |

### 5. Admin Console (`/api/v1/admin/*` — Requires Admin JWT or `x-admin-key`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/admin/summary` | KPI cards: Visitors, unique users, operations, exports, 24h trend |
| `GET` | `/api/v1/admin/charts` | Donut category share, top tools leaderboard, WebGPU fallback rates |
| `GET` | `/api/v1/admin/logs` | Server-side paginated activity table with category, tool & IP filters |
| `GET` | `/api/v1/admin/logs/export` | Download filtered log rows as CSV |
| `GET` | `/api/v1/admin/errors` | Grouped error logs with count, first-seen, and last-seen timestamps |
| `GET` | `/api/v1/admin/settings` | Get retention days, IP exclusions, and full-IP mode |
| `PATCH`| `/api/v1/admin/settings` | Update retention days (7-365) or IP exclusion hashes |
| `POST` | `/api/v1/admin/cleanup` | Trigger instant purge of expired logs older than retention days |

---

## 🔒 Security & Privacy Guarantees (PRD §17.9)
1. **Masked IP Addresses:** Plaintext IP addresses are never exposed in log outputs (`103.xxx.xxx.xxx`).
2. **Salted Hashing:** Unique visitors are tracked via one-way HMAC-SHA256 salted hashes.
3. **Cross-Origin Isolation:** Injects `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers to permit client-side multi-threaded WebAssembly & WebGPU execution.

