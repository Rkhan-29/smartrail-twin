// ============================================================
// middleware.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// BUG FIX: the backend previously had NO Cross-Origin Resource
// Sharing (CORS) handling anywhere. That's fine as long as the
// frontend is served from the exact same origin/port as this
// API, but RailFlow (the frontend) runs on its own dev server
// (Vite, e.g. http://localhost:5173) and, in production, is very
// likely deployed on a completely different domain than this
// backend. Without CORS headers, every browser fetch() call from
// the frontend to this backend was silently blocked by the
// browser — which looked like "the API is broken" even though
// the server was working fine.
//
// This Next.js Middleware runs in front of every request (App
// Router feature) and:
//   1. Answers CORS pre-flight (OPTIONS) requests immediately.
//   2. Adds the right Access-Control-* headers to every /api/*
//      response so browsers on an allowed origin can read it.
//
// Which origins are allowed is controlled by the CORS_ORIGIN env
// var (comma-separated list), e.g.:
//   CORS_ORIGIN=http://localhost:5173,https://railflow.example.com
// ============================================================

import { NextRequest, NextResponse } from "next/server";

function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN || "http://localhost:5173";
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function resolveAllowedOrigin(requestOrigin: string | null): string {
  const allowed = getAllowedOrigins();
  if (allowed.includes("*")) return "*";
  if (requestOrigin && allowed.includes(requestOrigin)) return requestOrigin;
  // Default to the first configured origin so the header is always
  // present (browsers ignore it if it doesn't match anyway).
  return allowed[0] || "";
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowOrigin = resolveAllowedOrigin(origin);

  // Pre-flight request — answer directly, don't hit any route handler.
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    res.headers.set("Access-Control-Allow-Origin", allowOrigin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.headers.set("Access-Control-Max-Age", "86400");
    return res;
  }

  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", allowOrigin);
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
