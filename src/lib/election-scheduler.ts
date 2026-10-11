import { prisma } from "@/lib/prisma";

export async function closeExpiredElections(now = new Date()) {
  const expiredElections = await prisma.election.findMany({
    where: {
      status: "OPEN",
      endsAt: { lte: now },
    },
    select: { id: true, title: true, endsAt: true },
  });
  const closedElectionIds: string[] = [];

  for (const election of expiredElections) {
    const closed = await prisma.$transaction(async (tx) => {
      const result = await tx.election.updateMany({
        where: {
          id: election.id,
          status: "OPEN",
          endsAt: { lte: now },
        },
        data: { status: "CLOSED" },
      });
      if (result.count === 0) return false;

      await tx.auditLog.create({
        data: {
          action: "ELECTION_CLOSED",
          detail: `Automatically closed at scheduled end time (${election.endsAt?.toISOString()}).`,
          electionId: election.id,
        },
      });
      return true;
    });

    if (closed) closedElectionIds.push(election.id);
  }

  return closedElectionIds;
}
