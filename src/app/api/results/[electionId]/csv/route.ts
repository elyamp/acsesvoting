import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isSameOriginRequest } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { verifyElectionBallots } from "@/lib/ballot-integrity";

export const dynamic = "force-dynamic";

export async function GET(req: Request, props: RouteContext<"/api/results/[electionId]/csv">) {
  const { electionId } = await props.params;
  const requestOrigin = req.headers.get("origin") ?? req.headers.get("referer");
  const requestHost = new URL(req.url).host;
  if (!isSameOriginRequest(requestOrigin, null, requestHost)) {
    return NextResponse.json({ error: "Request origin is not trusted." }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.kind !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const election = await prisma.election.findUnique({
    where: { id: electionId },
    include: {
      positions: {
        orderBy: { order: "asc" },
        include: { candidates: { include: { _count: { select: { votes: true } } } } },
      },
    },
  });
  if (!election) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const integrity = await verifyElectionBallots(electionId);
  if (!integrity.verified) {
    return NextResponse.json(
      { error: integrity.issue ?? "CSV export blocked because ballot integrity verification failed." },
      { status: 409 },
    );
  }

  const totalVoters = await prisma.voter.count();
  const votedCount = await prisma.voter.count({ where: { hasVoted: true } });

  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines: string[] = [
    `Election,${esc(election.title)}`,
    `Status,${esc(election.status)}`,
    `Registered voters,${totalVoters}`,
    `Votes cast,${votedCount}`,
    "",
    "Position,Candidate,Votes",
  ];
  for (const p of election.positions) {
    for (const c of p.candidates) {
      lines.push(`${esc(p.name)},${esc(c.name)},${c._count.votes}`);
    }
  }

  await audit("RESULTS_EXPORTED", {
    userId: session.sub,
    electionId,
    detail: election.title,
  });

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="acses-results-${election.id}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
