# SmartRail × RailFlow — Integrated Project

One working system built from three separate codebases, wired together per the
non-negotiable architecture:

| Layer     | Source project                          | Tech                          |
|-----------|------------------------------------------|--------------------------------|
| Frontend  | `frontend/` (from railflow-ai)            | React 19 + Vite + TypeScript   |
| Backend   | `backend/` (from smartrail-twin-backend)  | Next.js 14 (API routes) + MongoDB + Socket.IO |
| AI Engine | `ai-engine/` (from smartrail-ai-engine-v2)| FastAPI + scikit-learn/XGBoost/LightGBM |

See **BUGFIX_REPORT.md** for every bug found/fixed, and **GEMINI_AUDIT.md** for
the full Gemini → Claude audit.

## How the three talk to each other

```
 Browser
   │  HTTP (fetch)                         VITE_API_URL (prod)
   │  same-origin "/api" via Vite proxy (dev)
   ▼
 frontend/   (static SPA — no server-side logic of its own anymore)
   │
   │  REST, JSON  ──────────────────────────────────────►  backend/
   │                                                          │
   │                                              MONGO_URI   │  AI_ENGINE_URL
   │                                                 ▼        ▼
   │                                              MongoDB   ai-engine/  (FastAPI, port 8000)
   │                                                          │
   │                                                     ANTHROPIC_API_KEY
   │                                                     (advisory feature only)
```

- **frontend → backend**: plain `fetch()` calls from `src/services/api.ts`.
  In dev, Vite proxies same-origin `/api/*` to the backend (see
  `vite.config.ts`) so nothing needs configuring locally. In production, set
  `VITE_API_URL` to the deployed backend's URL.
- **backend → AI engine**: server-side `fetch()` calls from
  `services/aiEngine.ts`, controlled by `AI_ENGINE_URL`. If the AI engine is
  unreachable or its models aren't trained yet, the backend automatically
  falls back to transparent built-in math — nothing breaks.
- **backend → Claude**: `services/advisoryEngine.ts` calls Anthropic's API for
  the OCC operational-advisory feature (`POST /api/ai/advisory`), controlled
  by `ANTHROPIC_API_KEY`. This is what used to be Gemini — see
  GEMINI_AUDIT.md.

## Running it locally

### 1. AI Engine (optional but recommended — start first)
```bash
cd ai-engine
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python scripts/generate_data.py
python scripts/train_all.py        # trains + saves models/*.joblib — REQUIRED
                                    # before /predict/* endpoints work at all
uvicorn app.main:app --reload --port 8000   # NOTE: port 8000, matching the
                                             # backend's default AI_ENGINE_URL
                                             # (the engine's own README uses
                                             # 8001 — use 8000 here, or update
                                             # AI_ENGINE_URL in backend/.env)
```
Until you run `train_all.py`, `/predict/*` returns errors — the backend
detects this and transparently falls back to deterministic math, so the rest
of the system still works without it.

### 2. Backend
```bash
cd backend
cp .env.example .env.local     # then fill in MONGO_URI, JWT_SECRET, etc.
npm install
npm run seed                   # creates 4 sample stations + a train + login accounts
npm run dev                    # http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env.local     # defaults are fine for local dev
npm install
npm run dev                    # http://localhost:3000 (proxies /api -> :5000)
```

Open http://localhost:3000 — the dashboard will show live (mostly zero, until
sensors/seed data post readings) data from the real backend. If the backend
is ever unreachable, the UI falls back to its bundled sample data instead of
breaking, by design (see `src/services/api.ts`).

## Environment variables

See the root `.env.example` for the combined list, or each project's own
`.env.example` for details specific to that service.
