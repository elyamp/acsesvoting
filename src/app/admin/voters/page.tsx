import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import { AddVoterForm, BulkImportForm, VoterRowActions } from "@/components/admin/VoterForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Voters" };

export default async function VotersPage() {
  const session = await getSession();
  const voters = await prisma.voter.findMany({
    orderBy: { indexNumber: "asc" },
    select: {
      id: true,
      name: true,
      indexNumber: true,
      email: true,
      activatedAt: true,
      hasVoted: true,
    },
  });

  const activated = voters.filter((v) => v.activatedAt).length;
  const voted = voters.filter((v) => v.hasVoted).length;

  return (
    <div>
      <PageHeader
        title="Voter register"
        sub="Only pre-registered students can activate an account and vote"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Registered" value={voters.length} />
        <StatCard label="Activated" value={activated} />
        <StatCard label="Voted" value={voted} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AddVoterForm />
        <BulkImportForm />
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-surface/70 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Index No.</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {voters.map((v) => (
              <tr key={v.id} className="hover:bg-surface">
                <td className="px-4 py-3 font-medium">{v.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{v.indexNumber}</td>
                <td className="px-4 py-3 text-muted">{v.email}</td>
                <td className="px-4 py-3">
                  {v.hasVoted ? (
                    <Badge tone="blue">Voted</Badge>
                  ) : v.activatedAt ? (
                    <Badge tone="green">Activated</Badge>
                  ) : (
                    <Badge tone="amber">Pending activation</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <VoterRowActions
                    voter={{
                      id: v.id,
                      name: v.name,
                      indexNumber: v.indexNumber,
                      email: v.email,
                      activated: Boolean(v.activatedAt),
                      hasVoted: v.hasVoted,
                    }}
                    isSuperAdmin={session?.role === "SUPERADMIN"}
                  />
                </td>
              </tr>
            ))}
            {voters.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No voters registered yet. Add individually or bulk import above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
