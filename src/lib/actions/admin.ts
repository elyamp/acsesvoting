"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession, type SessionPayload } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  electionSchema,
  positionSchema,
  candidateSchema,
  voterSchema,
  bulkVotersSchema,
  adminUserSchema,
  isAllowedEmailDomain,
  firstError,
} from "@/lib/validation";
import type { ActionResult } from "./auth";

async function requireAdmin(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session || session.kind !== "admin") {
    return { ok: false, error: "Admin access required." };
  }
  return { ok: true, session };
}

async function requireSuperAdmin(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session || session.kind !== "admin" || session.role !== "SUPERADMIN") {
    return { ok: false, error: "Superadmin access required." };
  }
  return { ok: true, session };
}

function revalidateAdmin() {
  revalidatePath("/admin", "layout");
  revalidatePath("/vote");
}

// ---------- Elections ----------

export async function createElection(input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const parsed = electionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { title, description, startsAt, endsAt } = parsed.data;

  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
    return { ok: false, error: "Start time must be before end time." };
  }

  const election = await prisma.election.create({
    data: {
      title,
      description: description || null,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });
  await audit("ELECTION_CREATED", { userId: auth.session.sub, electionId: election.id, detail: title });
  revalidateAdmin();
  return { ok: true, redirectTo: `/admin/elections/${election.id}` };
}

export async function updateElection(electionId: string, input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const parsed = electionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { title, description, startsAt, endsAt } = parsed.data;

  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
    return { ok: false, error: "Start time must be before end time." };
  }

  await prisma.election.update({
    where: { id: electionId },
    data: {
      title,
      description: description || null,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });
  await audit("ELECTION_UPDATED", { userId: auth.session.sub, electionId, detail: title });
  revalidateAdmin();
  return { ok: true };
}

export async function setElectionStatus(electionId: string, status: "OPEN" | "CLOSED"): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const election = await prisma.election.findUnique({
    where: { id: electionId },
    include: { positions: { include: { candidates: true } } },
  });
  if (!election) return { ok: false, error: "Election not found." };

  if (status === "OPEN") {
    if (election.positions.length === 0) {
      return { ok: false, error: "Add at least one position before opening." };
    }
    if (election.positions.some((p) => p.candidates.length < 2)) {
      return { ok: false, error: "Every position needs at least 2 candidates before opening." };
    }
    const otherOpen = await prisma.election.count({
      where: { status: "OPEN", id: { not: electionId } },
    });
    if (otherOpen > 0) {
      return { ok: false, error: "Another election is already open. Close it first." };
    }
  }

  await prisma.election.update({ where: { id: electionId }, data: { status } });
  await audit(`ELECTION_${status}`, { userId: auth.session.sub, electionId, detail: election.title });
  revalidateAdmin();
  return { ok: true };
}

export async function deleteElection(electionId: string): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;
  const election = await prisma.election.findUnique({ where: { id: electionId } });
  if (!election) return { ok: false, error: "Election not found." };
  if (election.status !== "DRAFT") {
    return { ok: false, error: "Only draft elections can be deleted." };
  }
  await prisma.election.delete({ where: { id: electionId } });
  await audit("ELECTION_DELETED", { userId: auth.session.sub, detail: election.title });
  revalidateAdmin();
  return { ok: true, redirectTo: "/admin/elections" };
}

// ---------- Positions ----------

export async function createPosition(input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const parsed = positionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { electionId, name, order } = parsed.data;

  const existing = await prisma.position.findUnique({
    where: { electionId_name: { electionId, name } },
  });
  if (existing) return { ok: false, error: "That position already exists in this election." };

  const election = await prisma.election.findUnique({ where: { id: electionId } });
  if (!election) return { ok: false, error: "Election not found." };
  if (election.status !== "DRAFT") {
    return { ok: false, error: "Positions can only be added while the election is a draft." };
  }

  await prisma.position.create({ data: { electionId, name, order } });
  await audit("POSITION_CREATED", { userId: auth.session.sub, electionId, detail: name });
  revalidateAdmin();
  return { ok: true };
}

export async function deletePosition(positionId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const position = await prisma.position.findUnique({
    where: { id: positionId },
    include: { election: true },
  });
  if (!position) return { ok: false, error: "Position not found." };
  if (position.election.status !== "DRAFT") {
    return { ok: false, error: "Positions can only be removed while the election is a draft." };
  }
  await prisma.position.delete({ where: { id: positionId } });
  await audit("POSITION_DELETED", {
    userId: auth.session.sub,
    electionId: position.electionId,
    detail: position.name,
  });
  revalidateAdmin();
  return { ok: true };
}

// ---------- Candidates ----------

export async function createCandidate(input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const parsed = candidateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { positionId, name, bio, photoUrl } = parsed.data;

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    include: { election: true },
  });
  if (!position) return { ok: false, error: "Position not found." };
  if (position.election.status !== "DRAFT") {
    return { ok: false, error: "Candidates can only be added while the election is a draft." };
  }

  await prisma.candidate.create({
    data: { positionId, name, bio: bio || null, photoUrl: photoUrl || null },
  });
  await audit("CANDIDATE_CREATED", {
    userId: auth.session.sub,
    electionId: position.electionId,
    detail: `${name} for ${position.name}`,
  });
  revalidateAdmin();
  return { ok: true };
}

export async function deleteCandidate(candidateId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { position: { include: { election: true } } },
  });
  if (!candidate) return { ok: false, error: "Candidate not found." };
  if (candidate.position.election.status !== "DRAFT") {
    return { ok: false, error: "Candidates can only be removed while the election is a draft." };
  }
  await prisma.candidate.delete({ where: { id: candidateId } });
  await audit("CANDIDATE_DELETED", {
    userId: auth.session.sub,
    electionId: candidate.position.electionId,
    detail: `${candidate.name} (${candidate.position.name})`,
  });
  revalidateAdmin();
  return { ok: true };
}

// ---------- Voters ----------

export async function addVoter(input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const parsed = voterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { name, indexNumber, email } = parsed.data;

  if (!isAllowedEmailDomain(email)) {
    return { ok: false, error: `Email domain not allowed for ${email}` };
  }

  const dup = await prisma.voter.findFirst({
    where: { OR: [{ indexNumber }, { email }] },
  });
  if (dup) {
    return {
      ok: false,
      error: dup.indexNumber === indexNumber
        ? "A voter with this index number already exists."
        : "A voter with this email already exists.",
    };
  }

  await prisma.voter.create({ data: { name, indexNumber, email } });
  await audit("VOTER_ADDED", { userId: auth.session.sub, detail: `${name} (${indexNumber})` });
  revalidatePath("/admin/voters");
  return { ok: true };
}

export async function bulkImportVoters(input: unknown): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const parsed = bulkVotersSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const lines = parsed.data.csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { ok: false, error: "No lines to import." };
  if (lines.length > 2000) return { ok: false, error: "Import at most 2000 voters at a time." };

  const rows: { name: string; indexNumber: string; email: string }[] = [];
  const errors: string[] = [];
  const seenIndex = new Set<string>();
  const seenEmail = new Set<string>();

  for (const [i, line] of lines.entries()) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 3) {
      errors.push(`Line ${i + 1}: expected "Full Name, Index Number, Email"`);
      continue;
    }
    const [name, rawIndex, rawEmail] = parts;
    const row = voterSchema.safeParse({ name, indexNumber: rawIndex, email: rawEmail });
    if (!row.success) {
      errors.push(`Line ${i + 1}: ${firstError(row.error)}`);
      continue;
    }
    const { indexNumber, email } = row.data;
    if (!isAllowedEmailDomain(email)) {
      errors.push(`Line ${i + 1}: email domain not allowed (${email})`);
      continue;
    }
    if (seenIndex.has(indexNumber) || seenEmail.has(email)) {
      errors.push(`Line ${i + 1}: duplicate within the import list`);
      continue;
    }
    seenIndex.add(indexNumber);
    seenEmail.add(email);
    rows.push(row.data);
  }

  const existing = await prisma.voter.findMany({
    where: {
      OR: [
        { indexNumber: { in: rows.map((r) => r.indexNumber) } },
        { email: { in: rows.map((r) => r.email) } },
      ],
    },
    select: { indexNumber: true, email: true },
  });
  const existingIndex = new Set(existing.map((e) => e.indexNumber));
  const existingEmail = new Set(existing.map((e) => e.email));
  const fresh = rows.filter((r) => {
    if (existingIndex.has(r.indexNumber) || existingEmail.has(r.email)) {
      errors.push(`${r.indexNumber}: already registered, skipped`);
      return false;
    }
    return true;
  });

  if (fresh.length > 0) {
    await prisma.voter.createMany({ data: fresh });
  }
  await audit("VOTERS_IMPORTED", {
    userId: auth.session.sub,
    detail: `${fresh.length} imported, ${errors.length} issues`,
  });
  revalidatePath("/admin/voters");

  return {
    ok: true,
    summary: `Imported ${fresh.length} voter(s).${errors.length ? " Issues:\n" + errors.join("\n") : ""}`,
  };
}

export async function removeVoter(voterId: string): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;
  const voter = await prisma.voter.findUnique({ where: { id: voterId } });
  if (!voter) return { ok: false, error: "Voter not found." };
  if (voter.hasVoted) {
    return { ok: false, error: "Cannot remove a voter who has already voted." };
  }
  await prisma.voter.delete({ where: { id: voterId } });
  await audit("VOTER_REMOVED", { userId: auth.session.sub, detail: `${voter.name} (${voter.indexNumber})` });
  revalidatePath("/admin/voters");
  return { ok: true };
}

export async function resetVoterActivation(voterId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const voter = await prisma.voter.findUnique({ where: { id: voterId } });
  if (!voter) return { ok: false, error: "Voter not found." };
  if (voter.hasVoted) {
    return { ok: false, error: "Cannot reset a voter who has already voted." };
  }
  await prisma.$transaction([
    prisma.voter.update({
      where: { id: voterId },
      data: { passwordHash: null, activatedAt: null },
    }),
    prisma.otpCode.deleteMany({ where: { voterId } }),
  ]);
  await audit("VOTER_RESET", { userId: auth.session.sub, detail: `${voter.name} (${voter.indexNumber})` });
  revalidatePath("/admin/voters");
  return { ok: true };
}

// ---------- Admin users (superadmin only) ----------

export async function createAdminUser(input: unknown): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;
  const parsed = adminUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "An admin with this email already exists." };

  await prisma.user.create({
    data: { name, email, role, passwordHash: await bcrypt.hash(password, 12) },
  });
  await audit("ADMIN_CREATED", { userId: auth.session.sub, detail: `${name} (${email}, ${role})` });
  revalidatePath("/admin/admins");
  return { ok: true };
}

export async function toggleAdminActive(userId: string): Promise<ActionResult> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth;
  if (userId === auth.session.sub) {
    return { ok: false, error: "You cannot deactivate your own account." };
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  await prisma.user.update({ where: { id: userId }, data: { active: !user.active } });
  await audit("ADMIN_TOGGLED", {
    userId: auth.session.sub,
    detail: `${user.email} -> ${user.active ? "deactivated" : "activated"}`,
  });
  revalidatePath("/admin/admins");
  return { ok: true };
}
