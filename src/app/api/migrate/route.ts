import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ONE-TIME MIGRATION CHECK ROUTE — DELETE THIS FILE AFTER USE
// Instead of running migrations (not possible in serverless), this checks
// which tables exist so we can diagnose the schema state.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret");
  if (!secret || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Check which tables exist in the database
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
    `;

    // Check migration history
    const migrations = await prisma.$queryRaw<{ migration_name: string; finished_at: Date | null }[]>`
      SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY started_at;
    `.catch(() => "no _prisma_migrations table found");

    return NextResponse.json({ ok: true, tables, migrations });
  } catch (e) {
    const err = e as { message?: string };
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
