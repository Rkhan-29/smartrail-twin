// ============================================================
// server.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// A minimal host for the RailFlow single-page app — nothing more.
//
// INTEGRATION CHANGE: this file used to import `app` from
// `./src/server/app` — a whole bundled Express backend with its
// own mock station/train data AND a Gemini-powered chat endpoint
// (src/server/geminiService.ts). Per the project's architecture
// rule ("Frontend = RailFlow" — the UI only, not a second copy of
// the backend), that bundled mock backend has been removed
// entirely. This file now ONLY serves the built static assets
// (production) or proxies to Vite's dev middleware (development).
// All real data comes from the separate SmartRail backend, via
// VITE_API_URL — see src/services/api.ts and .env.example.
// ============================================================

import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const app = express();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RailFlow AI (frontend) running at http://0.0.0.0:${PORT}`);
    console.log(`Talking to backend at: ${process.env.VITE_API_URL || "/api (same-origin — set VITE_API_URL to point elsewhere)"}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start RailFlow AI frontend server:", err);
  process.exit(1);
});
