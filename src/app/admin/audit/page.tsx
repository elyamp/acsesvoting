import { prisma } from "@/lib/prisma";
import { Badge, Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      user: { select: { name: true, email: true } },
      election: { select: { title: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Audit log"
        sub="Every administrative action and vote event (never vote choices)"
      />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-surface/70 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3">Election</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-surface">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={log.action === "VOTE_CAST" ? "blue" : "slate"}>{log.action}</Badge>
                </td>
                <td className="px-4 py-3 text-muted">
                  {log.user ? log.user.name : log.action === "VOTE_CAST" ? "—" : "System"}
                </td>
                <td className="px-4 py-3 text-muted">{log.election?.title ?? "—"}</td>
                <td className="px-4 py-3">{log.detail}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
