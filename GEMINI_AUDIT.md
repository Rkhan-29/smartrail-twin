# Gemini API Audit

## Method

Searched every file in all three source projects for `gemini` (case-insensitive):

```
backend (smartrail-twin-backend-typescript-updated):  0 matches
ai-engine (smartrail-ai-engine-v2):                    0 matches
frontend (railflow-ai):                                4 files
```

## Findings

Gemini was used in **exactly one place**, entirely within the frontend's own
(now-removed) bundled mock backend:

| File | Usage |
|---|---|
| `frontend/src/server/geminiService.ts` | Called `@google/genai`'s `GoogleGenAI.models.generateContent()` to turn live crowd/recommendation data into a free-text "operational advisory" — a summary, key insights, recommended actions, and a risk level, as JSON. Purely a text-generation/summarization ("chatbot-style") feature — not a trained ML model, not used for ETA/crowd/occupancy/congestion *prediction* itself (those numbers were already computed deterministically before being handed to Gemini as context to summarize). |
| `frontend/src/server/app.ts` | Imported `generateOperationalAdvisory` from `geminiService.ts` and exposed it as `POST /api/ai/advisory` on the frontend's own bundled Express server. |
| `frontend/src/services/api.ts` | Frontend-side type/client only — `AiAdvisoryResult.source: 'GEMINI_AI' | 'DETERMINISTIC_ENGINE'` and the `getAiAdvisory()` fetch wrapper calling `POST /api/ai/advisory`. No Gemini API calls happen here; this just talks to whichever backend serves that route. |
| `frontend/api/index.js` (build artifact) | Bundled copy of the above, produced by esbuild for Vercel serverless deployment. Removed along with its source. |

## Classification

Per the integration rule:

> If Gemini is used only for chatbot/chat, remove Gemini and replace it with
> Claude. If Gemini is used for any existing feature such as ETA prediction,
> crowd prediction, digital twin, ML inference, dataset processing,
> embeddings, vision or analytics, DO NOT REMOVE IT.

This usage is a **chatbot/chat-style feature** — it takes already-computed
deterministic telemetry and asks an LLM to write a natural-language summary
and recommendation for a human controller. It does not perform ETA
prediction, crowd prediction, digital-twin state, ML inference, dataset
processing, embeddings, vision, or analytics — all of those are handled
entirely by `ai-engine/`'s trained models (crowd/eta/demand/occupancy/
congestion, in `app/runtime.py`) and the backend's own deterministic math
(`services/analyticsEngine.ts`), **neither of which ever used Gemini or any
other LLM**.

**Verdict: REMOVE Gemini, replace with Claude.** ✅ Done.

## What changed

- **Removed:** `frontend/src/server/geminiService.ts`,
  `frontend/src/server/app.ts` (and its `railwayEngine.ts`/`vercelHandler.ts`
  companions), `frontend/api/index.ts`/`index.js`, the `@google/genai`
  dependency, and the `GEMINI_API_KEY` env var (all removal is part of the
  broader "frontend must not ship its own backend" fix — see
  BUGFIX_REPORT.md #1).
- **Replaced with:** `backend/services/advisoryEngine.ts`, a new service on
  the *real* backend (where this feature belongs, architecturally) using
  Anthropic's `@anthropic-ai/sdk` (`claude-sonnet-4-6`). It reproduces the
  exact same behavior — same prompt structure, same JSON response schema
  (`summary`, `keyInsights`, `recommendedActions`, `riskLevel`), same
  deterministic rule-based fallback when no API key is configured or the API
  call fails — so the feature is functionally identical from the frontend's
  point of view, just now correctly located on the backend and Claude-backed.
  Exposed at `POST /api/ai/advisory` on the real backend (see
  `backend/app/api/ai/advisory/route.ts`).
- **Config:** `ANTHROPIC_API_KEY` added to `backend/.env.example`;
  `GEMINI_API_KEY` removed from `frontend/.env.example`.
- **Frontend type fix:** `AiAdvisoryResult.source` updated from
  `'GEMINI_AI' | 'DETERMINISTIC_ENGINE'` to
  `'CLAUDE_AI' | 'DETERMINISTIC_ENGINE'` in `src/services/api.ts`. No UI
  component branches on this value (verified by grep across
  `src/views`/`src/components`), so there is no visual/behavioral change
  beyond the label.

## What was NOT touched (confirmed Gemini-free already)

- `ai-engine/` — all prediction endpoints (`/predict/eta`, `/predict/crowd`,
  `/predict/demand`, `/predict/occupancy`, `/predict/congestion`) and the
  digital twin (`app/digital_twin.py`) run on scikit-learn/XGBoost/LightGBM
  models trained by `ml/train.py`. Zero Gemini references found here.
- `backend/services/aiEngine.ts`, `analyticsEngine.ts`, `digitalTwin.ts` —
  all deterministic/AI-engine-client code, zero Gemini references. (The AI
  integration *contract* bug in `aiEngine.ts` — mismatched field names to the
  real FastAPI schema — is unrelated to Gemini and is covered in
  BUGFIX_REPORT.md #2.)
