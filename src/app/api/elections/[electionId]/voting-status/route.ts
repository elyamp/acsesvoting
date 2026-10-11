import { getSession } from "@/lib/auth";
import { closeExpiredElections } from "@/lib/election-scheduler";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ electionId: string }> },
) {
  const session = await getSession();
  if (!session || session.kind !== "voter") {
    return Response.json({ error: "Student sign-in required." }, { status: 401 });
  }

  const { electionId } = await params;
  const now = new Date();
  await closeExpiredElections(now);

  const election = await prisma.election.findUnique({
    where: { id: electionId },
    select: { status: true, startsAt: true, endsAt: true },
  });

  const open = Boolean(
    election &&
    election.status === "OPEN" &&
    (!election.startsAt || election.startsAt <= now) &&
    (!election.endsAt || election.endsAt > now),
  );

  return Response.json(
    { open },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
