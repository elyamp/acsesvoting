import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Results" };

export default async function ResultsPage(props: PageProps<"/admin/results">) {
  const query = await props.searchParams;
  const elections = await prisma.election.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true, createdAt: true },
  });

  const selectedId = query.election || elections[0]?.id;
  const election = elections.find((e) => e.id === selectedId);

  const totalVoters = await prisma.voter.count();
  const votedCount = await prisma.voter.count({ where: { hasVoted: true } });

  return (
    <div>
      <PageHeader title="Results" sub="Live collation — visible to admins and superadmins only">
        {election && (
          <Link
            href={`/api/results/${election.id}/csv`}
            className="rounded-xl border border-line bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-card transition-colors hover:bg-surface"
          >
            Export CSV
          </Link>
        )}
      </PageHeader>

      {elections.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {elections.map((e) => (
            <Link
              key={e.id}
              href={`/admin/results?election=${e.id}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                e.id === selectedId
                  ? "border-accent-line bg-accent-soft text-accent-contrast"
                  : "border-line text-muted hover:text-foreground"
              }`}
            >
              {e.title}
            </Link>
          ))}
        </div>
      )}

      {!election ? (
        <Card>
          <p className="text-sm text-muted">No elections yet. Create one to see results here.</p>
        </Card>
      ) : (
        <Results electionId={election.id} electionTitle={election.title} electionStatus={election.status} totalVoters={totalVoters} votedCount={votedCount} />
      )}
    </div>
  );
}

async function Results({
  electionId,
  electionTitle,
  electionStatus,
  totalVoters,
  votedCount,
}: {
  electionId: string;
  electionTitle: string;
  electionStatus: string;
  totalVoters: number;
  votedCount: number;
}) {
  const positions = await prisma.position.findMany({
    where: { electionId },
    orderBy: { order: "asc" },
    include: {
      candidates: {
        include: { _count: { select: { votes: true } } },
        orderBy: { name: "asc" },
      },
    },
  });

  const turnout = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Election" value={electionTitle} sub={electionStatus} />
        <StatCard label="Votes cast" value={votedCount} sub={`${turnout}% of ${totalVoters} registered voters`} />
        <StatCard label="Positions" value={positions.length} />
      </div>

      {positions.map((position) => {
        const sorted = [...position.candidates].sort((a, b) => b._count.votes - a._count.votes);
        const top = sorted[0]?._count.votes ?? 0;
        const isTie = sorted.filter((c) => c._count.votes === top).length > 1 && top > 0;
        const max = Math.max(top, 1);

        return (
          <Card key={position.id}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">{position.name}</h2>
              {electionStatus === "CLOSED" && top > 0 && (
                <Badge tone={isTie ? "amber" : "green"}>{isTie ? "Tie" : "Winner"}</Badge>
              )}
            </div>
            <ul className="space-y-3">
              {sorted.map((c) => {
                const pct = votedCount > 0 ? Math.round((c._count.votes / votedCount) * 100) : 0;
                const leading = electionStatus === "CLOSED" && !isTie && c._count.votes === top && top > 0;
                return (
                  <li key={c.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className={leading ? "font-semibold text-accent-contrast" : "font-medium"}>
                        {c.name}
                      </span>
                      <span className="text-muted">
                        {c._count.votes} vote{c._count.votes === 1 ? "" : "s"} · {pct}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                      <div
                        className={`h-2.5 rounded-full transition-[width] ${leading ? "bg-accent" : "bg-accent/40"}`}
                        style={{ width: `${(c._count.votes / max) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
              {sorted.length === 0 && <li className="text-sm text-muted">No candidates.</li>}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
