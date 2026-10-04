import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

function statusTone(status: string) {
  return status === "OPEN" ? "green" : status === "CLOSED" ? "red" : "amber";
}

export default async function AdminDashboard() {
  const [totalVoters, activated, voted, elections, recentLogs] = await Promise.all([
    prisma.voter.count(),
    prisma.voter.count({ where: { activatedAt: { not: null } } }),
    prisma.voter.count({ where: { hasVoted: true } }),
    prisma.election.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { positions: true, votes: true } } } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
  ]);

  const turnout = totalVoters > 0 ? Math.round((voted / totalVoters) * 100) : 0;

  return (
    <div>
      <PageHeader title="Dashboard" sub="Overview of the electoral process" />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 animate-rise">
        <StatCard label="Registered voters" value={totalVoters} sub={`${activated} activated`} />
        <StatCard label="Votes cast" value={voted} sub={`${turnout}% turnout`} />
        <StatCard label="Elections" value={elections.length} sub={`${elections.filter((e) => e.status === "OPEN").length} open`} />
        <StatCard
          label="Open election"
          value={elections.find((e) => e.status === "OPEN")?.title ?? "None"}
        />
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-2 animate-rise" style={{ animationDelay: '100ms' }}>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Elections</h2>
            <Link href="/admin/elections" className="text-sm text-accent-contrast hover:underline">
              Manage →
            </Link>
          </div>
          {elections.length === 0 ? (
            <p className="text-sm text-muted">No elections yet. Create one to get started.</p>
          ) : (
            <ul className="divide-y divide-line">
              {elections.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/admin/elections/${e.id}`} className="text-sm font-medium hover:text-accent-contrast">
                      {e.title}
                    </Link>
                    <div className="text-xs text-muted">
                      {e._count.positions} positions · {e._count.votes} votes
                    </div>
                  </div>
                  <Badge tone={statusTone(e.status) as "green" | "red" | "amber"}>{e.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent activity</h2>
            <Link href="/admin/audit" className="text-sm text-accent-contrast hover:underline">
              Full log →
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {recentLogs.map((log) => (
              <li key={log.id} className="py-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-accent-contrast">{log.action}</span>
                  <span className="text-xs text-muted">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                {log.detail && <div className="mt-0.5 text-muted">{log.detail}</div>}
              </li>
            ))}
            {recentLogs.length === 0 && <li className="py-2 text-sm text-muted">No activity yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
