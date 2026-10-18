import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type BallotSelection = {
  positionId: string;
  candidateId: string;
};

type SerializedBallot = {
  version: 1;
  electionId: string;
  selections: BallotSelection[];
};

export type BallotIntegrity = {
  verified: boolean;
  ballotCount: number;
  issue?: string;
};

function getSigningKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set to a strong value (min 16 chars)");
  }

  return createHmac("sha256", secret)
    .update("acses-anonymous-ballot-signature-v1")
    .digest();
}

function signatureFor(id: string, payload: string) {
  return createHmac("sha256", getSigningKey())
    .update(`${id}\n${payload}`)
    .digest("hex");
}

export function serializeBallot(
  id: string,
  electionId: string,
  selections: BallotSelection[],
) {
  const serialized: SerializedBallot = {
    version: 1,
    electionId,
    selections: [...selections].sort((a, b) =>
      a.positionId.localeCompare(b.positionId),
    ),
  };
  const payload = JSON.stringify(serialized);

  return { payload, signature: signatureFor(id, payload) };
}

export function verifyBallotSignature(id: string, payload: string, signature: string) {
  if (!/^[\da-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(signatureFor(id, payload), "hex");
  const actual = Buffer.from(signature, "hex");
  return timingSafeEqual(expected, actual);
}

function isSerializedBallot(value: unknown, electionId: string): value is SerializedBallot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const ballot = value as Partial<SerializedBallot>;
  if (ballot.version !== 1 || ballot.electionId !== electionId || !Array.isArray(ballot.selections)) {
    return false;
  }

  const positions = new Set<string>();
  return ballot.selections.every((selection) => {
    if (
      !selection ||
      typeof selection.positionId !== "string" ||
      !selection.positionId ||
      typeof selection.candidateId !== "string" ||
      !selection.candidateId ||
      positions.has(selection.positionId)
    ) {
      return false;
    }
    positions.add(selection.positionId);
    return true;
  });
}

function selectionKey(positionId: string, candidateId: string) {
  return JSON.stringify([positionId, candidateId]);
}

export async function verifyElectionBallots(
  electionId: string,
): Promise<BallotIntegrity> {
  return prisma.$transaction(async (tx) => {
    const records = await tx.ballotRecord.findMany({
      where: { electionId },
      select: { id: true, payload: true, signature: true },
    });
    const votes = await tx.vote.findMany({
      where: { electionId },
      select: { positionId: true, candidateId: true },
    });

    if (records.length === 0 && votes.length > 0) {
      return {
        verified: false,
        ballotCount: 0,
        issue: `This election has ${votes.length} recorded vote selections but no signed ballot records. Historical votes cannot be authenticated, so results remain withheld.`,
      };
    }

    // Ballots are anonymous, so there is no reliable per-election voter mapping to compare
    // against the signed ballot count. Integrity must be validated by checking each ballot's
    // signature and comparing its selections to the recorded vote rows for the same election.

    const signedSelections: string[] = [];
    for (const record of records) {
      if (!verifyBallotSignature(record.id, record.payload, record.signature)) {
        return {
          verified: false,
          ballotCount: records.length,
          issue: "At least one ballot signature is invalid. Results remain withheld.",
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(record.payload);
      } catch {
        return {
          verified: false,
          ballotCount: records.length,
          issue: "At least one signed ballot contains invalid serialized data. Results remain withheld.",
        };
      }
      if (!isSerializedBallot(parsed, electionId)) {
        return {
          verified: false,
          ballotCount: records.length,
          issue: "At least one signed ballot does not belong to this election or has invalid selections. Results remain withheld.",
        };
      }
      signedSelections.push(
        ...parsed.selections.map((selection) =>
          selectionKey(selection.positionId, selection.candidateId),
        ),
      );
    }

    const recordedSelections = votes.map((vote) =>
      vote.candidateId
        ? selectionKey(vote.positionId, vote.candidateId)
        : selectionKey(vote.positionId, ""),
    );
    signedSelections.sort();
    recordedSelections.sort();

    const matches =
      signedSelections.length === recordedSelections.length &&
      signedSelections.every((selection, index) => selection === recordedSelections[index]);

    return {
      verified: matches,
      ballotCount: records.length,
      ...(matches
        ? {}
        : { issue: "Signed ballot selections do not match the recorded vote rows. Results remain withheld." }),
    };
  });
}
