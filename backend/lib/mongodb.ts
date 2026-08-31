// ============================================================
// lib/mongodb.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// Connects to MongoDB. This looks more complicated than a
// normal database connection because of how Next.js works: in
// development mode, Next.js "hot reloads" your code every time
// you save a file, which would normally open a brand new
// database connection each time — quickly using up all
// available connections. This file fixes that by "caching" the
// connection on the global object, so we reuse the same one
// instead of opening a new one on every reload.
// ============================================================

import mongoose from "mongoose";

// BUGFIX: this used to read MONGO_URI and `throw` at MODULE LOAD TIME
// (i.e. the instant anything did `import { connectToDatabase } from
// "@/lib/mongodb"`). That crashes `next build` and any route/module
// that merely imports this file before .env has been loaded (or in
// any environment where MONGO_URI isn't set yet), even if that
// particular request never actually needed the database. The check
// is now done lazily, inside connectToDatabase(), so importing this
// module is always safe and the helpful error only fires when a
// database connection is actually attempted.
function getMongoUri(): string {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error(
      "MONGO_URI is not set. Copy .env.example to .env.local and fill in your MongoDB connection string."
    );
  }
  return uri;
}

// TypeScript doesn't know about our custom global cache property by
// default, so we describe its shape here. This is only a type-level
// declaration — it doesn't run any code.
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

// Reuse the cache across hot-reloads in development, or create it
// fresh the first time in production.
const cached = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

/**
 * connectToDatabase
 * Human explanation: The function every API route calls at the
 * very start, before touching the database. If we're already
 * connected, it instantly hands back the existing connection
 * (fast, no wasted work). If we're not connected yet, it opens
 * one connection and remembers it for next time.
 */
export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(getMongoUri()).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
