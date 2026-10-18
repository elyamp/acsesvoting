import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";

// Only polyfill WebSocket for runtimes that don't provide it natively (e.g. Node < 18).
// Vercel runs Node 18+ which has a native WebSocket global — forcing the `ws` package
// on top of it breaks the Neon serverless driver and causes a runtime crash.
if (typeof globalThis.WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require("ws");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const rawUrl = process.env.DATABASE_URL ?? "";

// Neon's Vercel integration appends channel_binding=require which breaks
// the serverless driver. Strip it cleanly from the query string.
// During build time rawUrl may be empty — the adapter is only used at runtime.
const connectionString = rawUrl
  ? (() => { const u = new URL(rawUrl); u.searchParams.delete("channel_binding"); return u.toString(); })()
  : "";

const adapter = connectionString ? new PrismaNeon({ connectionString }) : undefined;
export const prisma = globalForPrisma.prisma ?? new PrismaClient(adapter ? { adapter } : undefined);

// Cache the client instance across hot-reloads in development.
// In production (Vercel), each function instance is already isolated.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
