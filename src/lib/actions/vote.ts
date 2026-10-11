"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSession, hasValidRequestOrigin } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";
import { serializeBallot } from "@/lib/ballot-integrity";
import { closeExpiredElections } from "@/lib/election-scheduler";
import { castBallotSchema, firstError } from "@/lib/validation";
import type { ActionResult } from "./auth";

export async function castBallot(input: unknown): Promise<ActionResult> {
  if (!(await hasValidRequestOrigin())) {
    return { ok: false, error: "Request origin is not trusted." };
  }

  const session = await getSession();
  if (!session || session.kind !== "voter") {
    return { ok: false, error: "You must be signed in as a student to vote." };
  }
  if (!rateLimit(`vote:${session.sub}`, 10, 60_000)) {
    return { ok: false, error: "Too many requests. Please wait a moment." };
  }

  const parsed = castBallotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { electionId, selections } = parsed.data;
  const now = new Date();
  await closeExpiredElections(now);

  const election = await prisma.election.findUnique({
    where: { id: electionId },
    include: { positions: true },
  });
  if (!election || election.status !== "OPEN") {
    return { ok: false, error: "This election is not open for voting." };
  }
  if (election.startsAt && now < election.startsAt) {
    return { ok: false, error: "Voting has not started yet." };
  }
  if (election.endsAt && now >= election.endsAt) {
    return { ok: false, error: "Voting has closed." };
  }

  const voter = await prisma.voter.findUnique({ where: { id: session.sub } });
  if (!voter || !voter.activatedAt) {
    return { ok: false, error: "Voter account not found or not activated." };
  }
  if (voter.hasVoted) {
    return { ok: false, error: "You have already voted in this election." };
  }

  // Exactly one valid selection per position, all candidates in this election
  const positions = election.positions;
  if (selections.length !== positions.length) {
    return { ok: false, error: "You must select a candidate for every position." };
  }
  const seenPositions = new Set<string>();
  for (const s of selections) {
    if (seenPositions.has(s.positionId)) {
      return { ok: false, error: "Duplicate selection for a position." };
    }
    seenPositions.add(s.positionId);
  }
  if (seenPositions.size !== positions.length || !positions.every((p) => seenPositions.has(p.id))) {
    return { ok: false, error: "Ballot does not match the election positions." };
  }

  const candidates = await prisma.candidate.findMany({
    where: { id: { in: selections.map((s) => s.candidateId) } },
    include: { position: true },
  });
  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  for (const s of selections) {
    const c = candidateById.get(s.candidateId);
    if (!c || c.positionId !== s.positionId || c.position.electionId !== electionId) {
      return { ok: false, error: "Ballot contains invalid candidates." };
    }
  }

  const ballotId = randomUUID();
  const signedBallot = serializeBallot(ballotId, electionId, selections);

  try {
    await prisma.$transaction(async (tx) => {
      const transactionTime = new Date();
      const electionOpen = await tx.election.updateMany({
        where: {
          id: electionId,
          status: "OPEN",
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: transactionTime } }] },
            { OR: [{ endsAt: null }, { endsAt: { gt: transactionTime } }] },
          ],
        },
        data: { status: "OPEN" },
      });
      if (electionOpen.count === 0) throw new Error("ELECTION_CLOSED");

      // Atomic one-vote-per-voter guard
      const claimed = await tx.voter.updateMany({
        where: { id: voter.id, hasVoted: false },
        data: { hasVoted: true },
      });
      if (claimed.count === 0) throw new Error("ALREADY_VOTED");
      await tx.vote.createMany({
        data: selections.map((s) => ({
          electionId,
          positionId: s.positionId,
          candidateId: s.candidateId,
        })),
      });
      await tx.ballotRecord.create({
        data: {
          id: ballotId,
          electionId,
          payload: signedBallot.payload,
          signature: signedBallot.signature,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY_VOTED") {
      return { ok: false, error: "You have already voted in this election." };
    }
    if (e instanceof Error && e.message === "ELECTION_CLOSED") {
      return { ok: false, error: "Voting is closed. The ballot was not submitted." };
    }
    throw e;
  }

  // Audit records that a vote happened, never what was chosen (ballot secrecy)
  await audit("VOTE_CAST", { electionId, detail: `Voter ${voter.indexNumber} cast a ballot` });

  return { ok: true, redirectTo: "/voted" };
}
