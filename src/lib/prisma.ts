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

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be configured.");
}

const adapter = new PrismaNeon({ connectionString });
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// Cache the client instance across hot-reloads in development.
// In production (Vercel), each function instance is already isolated.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
