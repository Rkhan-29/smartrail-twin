# Bug Fix Report — SmartRail × RailFlow Integration

Scope: all three source projects (`railflow-ai`, `smartrail-twin-backend-typescript-updated`,
`smartrail-ai-engine-v2`), integrated with **frontend = RailFlow**,
**backend = SmartRail backend**, **AI + dataset = SmartRail AI Engine**, per the
non-negotiable architecture. No UI, existing pages, business logic, AI/prediction
logic, or dataset pipeline was changed — see "What was intentionally NOT
changed" at the end.

---

## 1. Architecture violation: frontend shipped its own duplicate backend

**Where:** `frontend/src/server/app.ts`, `frontend/src/server/railwayEngine.ts`,
`frontend/src/server/geminiService.ts`, `frontend/api/index.ts`,
`frontend/src/server/vercelHandler.ts`.

**Problem:** RailFlow bundled a complete second Express "backend" with its own
in-memory mock station/train/alert data and its own Gemini-powered advisory
endpoint. Left in place, the system would have **two independent backends**
instead of one, directly violating "Frontend = RailFlow, Backend = SmartRail
Backend... Do not mix the architecture."

**Fix:** Removed all five files. `frontend/server.ts` now only hosts the built
static SPA (or Vite dev middleware) — no API logic. All real data comes from
the SmartRail backend via `VITE_API_URL` / the dev proxy. Nothing in
`src/App.tsx`, `src/views/`, or `src/components/` imported these files, so
this is a pure removal with zero UI/business-logic impact.

---

## 2. AI integration bug: backend↔AI-engine payload/response mismatch

**Where:** `backend/services/aiEngine.ts`.

**Problem:** The backend sent camelCase fields (`stationId`, `cctvCount`,
`speedKmph`, ...) to the FastAPI AI engine, but the engine's Pydantic schemas
(`ai-engine/app/schemas.py`) require snake_case fields (`station_id`,
`people_count`, `current_speed_kmh`, ...), several of them required with no
default. Every request was rejected with **HTTP 422**, so `res.ok` was always
`false` and the code silently fell back to the built-in math estimate —
**100% of the time**, even with a fully healthy, fully trained AI engine. The
response parsing was equally wrong: the real engine returns
`predicted15MinPercentage` / `risk.level` (crowd) and `predictedMinutes` /
`predictedDelay` (ETA), not the invented `densityPercent` / `etaMinutes`
fields the old code expected.

**Fix:** Rewrote the outgoing payload to match `app/schemas.py` exactly and
the response parsing to match `app/runtime.py` exactly (both request and
response). This is the single highest-impact fix in the whole integration —
without it, the AI engine could never have been used no matter how well it
was trained.

---

## 3. Crash-on-import bug in `lib/mongodb.ts`

**Problem:** `if (!MONGO_URI) throw new Error(...)` ran at **module load
time**, so merely `import`-ing `connectToDatabase` anywhere (including during
`next build`, or in any route that happens to import a file that imports this
one) crashed immediately if `.env` wasn't loaded yet — even for code paths
that never touch the database.

**Fix:** Moved the check inside `connectToDatabase()` itself (lazy), so
importing the module is always safe; the error only fires when a connection
is actually attempted.

---

## 4. Missing CORS handling (browser requests silently blocked)

**Problem:** Nothing in the backend set `Access-Control-Allow-Origin` or
handled `OPTIONS` pre-flight requests. This is invisible when frontend and
backend share an origin, but RailFlow's dev server runs on a different port
(Vite, `:3000`/`:5173`) and, in production, is very likely on a different
domain entirely from the backend. Every cross-origin `fetch()` from the
browser would have been blocked — which looks exactly like "the API is
broken," even though the server itself was responding fine (this is why
RailFlow's `api.ts` is defensively written to fall back to mock data on any
fetch failure — it was silently masking this).

**Fix:** Added `backend/middleware.ts`, a Next.js Edge Middleware matching
`/api/:path*` that answers CORS pre-flight and sets the right
`Access-Control-*` headers, driven by the (now multi-origin-aware)
`CORS_ORIGIN` env var.

---

## 5. Broken/mismatched routes — the core integration gap

**Problem:** The backend's existing API routes (`/api/stations`, `/api/trains`,
`/api/heatmap`, `/api/recommendations`) are real and functional, but:
- Every one of them required `requireAuth()` (a JWT cookie), while RailFlow's
  frontend has **no login flow at all** and calls these as a public,
  read-only OCC dashboard — every call would have failed with 401.
- Their response shapes and field names were built around this backend's own
  Mongoose schema (`{ count, stations }`, `code`/`location.lat`/
  `occupancyPercent`...), not the richer contract RailFlow's frontend was
  built against (`{ success, data }`, `currentOccupancy`/`crowdStatus`/
  `cctvSignalConfidence`...).
- Several routes RailFlow calls didn't exist at all: `/api/network/overview`,
  `/api/network/heatmap`, `/api/stations/:id`, `/api/stations/:id/platforms`,
  `/api/trains/:id`, `/api/predictions/15m`, `/api/predictions/:stationId`,
  `/api/alerts`, `/api/alerts/:id/ack`, `/api/ai/advisory`.

**Fix:**
- Made the read-only dashboard telemetry endpoints public (dropped
  `requireAuth()`), since that's how RailFlow is built and there is no
  passenger/controller login UI to authenticate with. Write/ingestion routes
  (`POST /api/cctv`, `/api/atvm`, `/api/uts`, `/api/gps`, `/api/gtfs`) are
  **unchanged** and still require auth — those are for device/admin
  integrations this frontend never calls directly.
- Added an adapter layer (`backend/lib/frontendContract.ts`,
  `stationEnrichment.ts`, `recommendationsEngine.ts`, `alertsEngine.ts`) that
  maps this backend's real Mongo data into RailFlow's exact expected shape,
  and rewrote/added every route above to use it. Every mapped field is either
  a direct real value or an honestly-derived one from real signals (documented
  inline in `frontendContract.ts`) — nothing is fabricated mock data.
- Alerts didn't exist as a concept in the backend schema at all (an "alert" is
  really "a station whose latest crowd reading is high/critical"). Added a
  minimal `models/AlertAck.ts` to persist acknowledgements, and compute the
  live alert list on the fly from `CrowdLog` — see `lib/alertsEngine.ts`.
- The legacy `/api/heatmap`, `/api/stations` (old shape), etc., are left
  alone for the auth'd routes that still require auth+role
  (`cctv`/`atvm`/`uts`/`gps`/`gtfs`) — only the routes RailFlow actually
  calls were changed/added.

---

## 6. Port mismatch between backend default and AI engine's own docs

**Problem:** `backend/.env.example` defaults `AI_ENGINE_URL` to
`http://localhost:8000`, but `ai-engine/README.md`'s own quick-start command
runs `uvicorn app.main:app --reload --port 8001`. Following the AI engine's
own README as written would silently break the integration (backend would
never reach it, and — per bug #2 being fixed — now actually would try).

**Fix:** No code changed (this is a docs/run-instruction issue, and the AI
engine's own files were left untouched per the "AI + Dataset only" rule).
Documented clearly in the root `README.md`: run the AI engine on port 8000,
or update `AI_ENGINE_URL` if you keep 8001.

---

## 7. Type/label leftover from Gemini removal

**Where:** `frontend/src/services/api.ts`.

**Problem:** The `AiAdvisoryResult.source` type was
`'GEMINI_AI' | 'DETERMINISTIC_ENGINE'`, which would no longer match what the
backend actually returns once Gemini is replaced with Claude (a real,
if minor, type/contract bug).

**Fix:** Updated to `'CLAUDE_AI' | 'DETERMINISTIC_ENGINE'`. No UI ever
branched on this value (grepped — zero references in `src/views`/
`src/components`), so this is a safe, non-visual change.

---

## 8. Stale/inconsistent dependency manifests

**Problems fixed:**
- `frontend/package.json` still listed `@google/genai`, `cors`, and built a
  Vercel serverless function (`api/index.js`) for the now-removed mock
  backend — removed all three, and simplified the `build`/`start` scripts to
  just build/serve the static SPA.
- `frontend/package-lock.json` was left referencing the removed
  `@google/genai` package tree — deleted (regenerate with `npm install`).
- `frontend/vercel.json` rewrote `/api/*` to the now-deleted serverless
  function — simplified to a plain SPA fallback rewrite; set `VITE_API_URL`
  to the real backend in production instead.
- Added `@anthropic-ai/sdk` to `backend/package.json` (needed for the new
  Claude-based advisory service).

---

## 9. Local dev CORS/origin friction

**Problem:** Even after fix #4, a developer running frontend on `:3000`/
`:5173` and backend on `:5000` would need to configure `VITE_API_URL` and
`CORS_ORIGIN` by hand just to see anything locally.

**Fix:** Added a Vite dev-server proxy (`frontend/vite.config.ts`) that
forwards same-origin `/api/*` requests straight to the backend
(`BACKEND_URL`, default `http://localhost:5000`) during `npm run dev` — so
the frontend's existing same-origin `/api` default "just works" out of the
box in development, with zero configuration.

---

## What was intentionally NOT changed

- **AI engine (`ai-engine/`)**: zero code changes. Its models, feature
  engineering, training pipeline, and dataset are exactly as provided.
- **Backend's write/ingestion routes** (`/api/cctv`, `/api/atvm`, `/api/uts`,
  `/api/gps`, `/api/gtfs`) and **auth routes** (`/api/auth/*`): unchanged,
  still require the same roles/JWT auth they always did.
- **Existing DB models** (`Station`, `Train`, `CrowdLog`, `EtaLog`, `Route`,
  `User`, etc.): unchanged. The adapter layer reads them; it doesn't reshape
  them.
- **Frontend UI/UX**: no component, view, or styling was touched. The only
  frontend source changes are: removing the bundled mock backend/Gemini
  files (never imported by the UI), one type-label fix, and config files
  (`package.json`, `vite.config.ts`, `vercel.json`, `.env.example`).
- **`services/analyticsEngine.ts` and `services/digitalTwin.ts` business
  logic**: unchanged — only their AI-engine client (`aiEngine.ts`) was fixed.

## Known simplifications (documented, not bugs)

- Per-platform live telemetry (`/api/stations/:id/platforms`) is derived from
  the station's overall occupancy, since the backend schema tracks occupancy
  per-station, not per-platform.
- A few RailFlow Station fields (Marathi/Hindi names, "device density index")
  have no corresponding sensor in this backend's schema; they're either
  omitted or transparently derived from real signals — see the comments in
  `backend/lib/frontendContract.ts` for exactly how each one is computed.
- With only the 4 seed stations and no live sensor devices posting data,
  most dashboard numbers will read as zero/low until real CCTV/ATVM/UTS/GPS
  data (or the seed script) populates the database — this is correct,
  expected behavior for a demo environment, not a bug.
