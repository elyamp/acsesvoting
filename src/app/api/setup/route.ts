import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// ONE-TIME SETUP ROUTE — DELETE THIS FILE AFTER USE
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret");
  if (!secret || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { email, password, name } = body;

  if (!email || !password || !name) {
    return NextResponse.json({ error: "email, password, and name are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "User already exists", email: existing.email }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: "SUPERADMIN",
      active: true,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });

  return NextResponse.json({ ok: true, id: user.id, email: user.email, role: user.role });
}
