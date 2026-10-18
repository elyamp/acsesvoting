import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

// ONE-TIME MIGRATION ROUTE — DELETE THIS FILE AFTER USE
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret");
  if (!secret || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const output = execSync("npx prisma migrate deploy", {
      env: { ...process.env },
      encoding: "utf8",
      timeout: 30000,
    });
    return NextResponse.json({ ok: true, output });
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return NextResponse.json({ ok: false, stdout: err.stdout, stderr: err.stderr, message: err.message }, { status: 500 });
  }
}
