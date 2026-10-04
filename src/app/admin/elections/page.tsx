import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Card, PageHeader } from "@/components/ui";
import ElectionForm from "@/components/admin/ElectionForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Elections" };

export default async function ElectionsPage() {
  const elections = await prisma.election.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { positions: true, votes: true } } },
  });

  return (
    <div className="animate-rise">
      <PageHeader title="Elections" sub="Create and manage elections" />
      <div className="grid gap-6 xl:grid-cols-2">
        <ElectionForm />
        <Card>
          <h2 className="mb-4 font-semibold">All elections</h2>
          {elections.length === 0 ? (
            <p className="text-sm text-muted">No elections yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {elections.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link
                      href={`/admin/elections/${e.id}`}
                      className="text-sm font-medium hover:text-accent-contrast"
                    >
                      {e.title}
                    </Link>
                    <div className="text-xs text-muted">
                      {e._count.positions} positions · {e._count.votes} votes
                      {e.endsAt && ` · closes ${new Date(e.endsAt).toLocaleString()}`}
                    </div>
                  </div>
                  <Badge
                    tone={e.status === "OPEN" ? "green" : e.status === "CLOSED" ? "red" : "amber"}
                  >
                    {e.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
