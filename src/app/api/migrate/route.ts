import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ONE-TIME MIGRATION ROUTE — DELETE THIS FILE AFTER USE
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret");
  if (!secret || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: string[] = [];

  try {
    // Migration 1: init — create all base tables
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "public"`);
    results.push("schema ok");

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'ADMIN',
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push("User table ok");

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Voter" (
        "id" TEXT NOT NULL,
        "indexNumber" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "passwordHash" TEXT,
        "activatedAt" TIMESTAMP(3),
        "hasVoted" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Voter_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push("Voter table ok");

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Voter_indexNumber_key" ON "Voter"("indexNumber")`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Voter_email_key" ON "Voter"("email")`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OtpCode" (
        "id" TEXT NOT NULL,
        "voterId" TEXT NOT NULL,
        "codeHash" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push("OtpCode table ok");

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "OtpCode_voterId_key" ON "OtpCode"("voterId")`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Election" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "startsAt" TIMESTAMP(3),
        "endsAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push("Election table ok");

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Position" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        "electionId" TEXT NOT NULL,
        CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push("Position table ok");

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Position_electionId_name_key" ON "Position"("electionId", "name")`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Candidate" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "bio" TEXT,
        "photoUrl" TEXT,
        "positionId" TEXT NOT NULL,
        "voterId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push("Candidate table ok");

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Candidate_voterId_key" ON "Candidate"("voterId")`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Vote" (
        "id" TEXT NOT NULL,
        "electionId" TEXT NOT NULL,
        "positionId" TEXT NOT NULL,
        "candidateId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push("Vote table ok");

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Vote_electionId_positionId_idx" ON "Vote"("electionId", "positionId")`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "detail" TEXT,
        "userId" TEXT,
        "electionId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push("AuditLog table ok");

    // Foreign keys (ignore if already exist)
    const fks = [
      `ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Position" ADD CONSTRAINT "Position_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "Vote" ADD CONSTRAINT "Vote_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Vote" ADD CONSTRAINT "Vote_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Vote" ADD CONSTRAINT "Vote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    ];
    for (const fk of fks) {
      await prisma.$executeRawUnsafe(fk).catch(() => null); // ignore duplicate constraint errors
    }
    results.push("foreign keys ok");

    // Migration 2: add classGroup and BallotRecord
    await prisma.$executeRawUnsafe(`ALTER TABLE "Voter" ADD COLUMN IF NOT EXISTS "classGroup" TEXT NOT NULL DEFAULT 'UNASSIGNED'`);
    results.push("classGroup column ok");

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Voter_classGroup_indexNumber_idx" ON "Voter"("classGroup", "indexNumber")`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BallotRecord" (
        "id" TEXT NOT NULL,
        "electionId" TEXT NOT NULL,
        "payload" TEXT NOT NULL,
        "signature" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BallotRecord_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push("BallotRecord table ok");

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BallotRecord_electionId_createdAt_idx" ON "BallotRecord"("electionId", "createdAt")`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "BallotRecord" ADD CONSTRAINT "BallotRecord_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE CASCADE ON UPDATE CASCADE`).catch(() => null);

    results.push("ALL MIGRATIONS COMPLETE");
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    const err = e as { message?: string };
    return NextResponse.json({ ok: false, error: err.message, completedSteps: results }, { status: 500 });
  }
}
