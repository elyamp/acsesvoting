import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import { AddVoterForm, BulkImportForm, VoterRowActions } from "@/components/admin/VoterForms";
import { voterClasses, voterClassLabel } from "@/lib/voter-classes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Voters" };

export default async function VotersPage(props: PageProps<"/admin/voters">) {
  const session = await getSession();
  const query = await props.searchParams;
  const requestedClass = typeof query.classGroup === "string" ? query.classGroup : "";
  const selectedClassGroup = requestedClass === "UNASSIGNED" ||
    voterClasses.some((studentClass) => studentClass.value === requestedClass)
    ? requestedClass
    : undefined;
  const selectedClassLabel = selectedClassGroup ? voterClassLabel(selectedClassGroup) : undefined;
  const [voters, registered, activated, voted] = await Promise.all([
    prisma.voter.findMany({
      ...(selectedClassGroup ? { where: { classGroup: selectedClassGroup } } : {}),
      orderBy: [{ classGroup: "asc" }, { indexNumber: "asc" }],
      select: {
        id: true,
        name: true,
        indexNumber: true,
        email: true,
        classGroup: true,
        activatedAt: true,
        hasVoted: true,
      },
    }),
    prisma.voter.count(),
    prisma.voter.count({ where: { activatedAt: { not: null } } }),
    prisma.voter.count({ where: { hasVoted: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Voter register"
        sub="Only pre-registered students can activate an account and vote"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Registered" value={registered} />
        <StatCard label="Activated" value={activated} />
        <StatCard label="Voted" value={voted} />
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Download class registers</h2>
            <p className="mt-1 text-sm text-muted">CSV exports are available to signed-in administrators.</p>
          </div>
          <Link
            href="/api/admin/voters/export?classGroup=all"
            className="rounded-xl border border-line bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-card transition-colors hover:bg-surface"
          >
            Download all classes
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {voterClasses.map((studentClass) => (
            <Link
              key={studentClass.value}
              href={`/api/admin/voters/export?classGroup=${studentClass.value}`}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-accent-line hover:bg-accent-soft hover:text-accent-contrast"
            >
              {studentClass.label} CSV
            </Link>
          ))}
          <Link
            href="/api/admin/voters/export?classGroup=UNASSIGNED"
            className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-accent-line hover:bg-accent-soft hover:text-accent-contrast"
          >
            Unassigned CSV
          </Link>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <AddVoterForm />
        <BulkImportForm />
      </div>

      <div className="my-6 flex flex-wrap gap-2">
        <Link
          href="/admin/voters"
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${!selectedClassGroup ? "border-accent-line bg-accent-soft text-accent-contrast" : "border-line text-muted hover:bg-surface"}`}
        >
          All classes
        </Link>
        {voterClasses.map((studentClass) => (
          <Link
            key={studentClass.value}
            href={`/admin/voters?classGroup=${studentClass.value}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedClassGroup === studentClass.value ? "border-accent-line bg-accent-soft text-accent-contrast" : "border-line text-muted hover:bg-surface"}`}
          >
            {studentClass.label}
          </Link>
        ))}
        <Link
          href="/admin/voters?classGroup=UNASSIGNED"
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedClassGroup === "UNASSIGNED" ? "border-accent-line bg-accent-soft text-accent-contrast" : "border-line text-muted hover:bg-surface"}`}
        >
          Unassigned
        </Link>
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-surface/70 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3">Class</th>
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
                <td className="whitespace-nowrap px-4 py-3"><Badge>{voterClassLabel(v.classGroup)}</Badge></td>
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
                      classGroup: v.classGroup,
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
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {selectedClassLabel ? `No voters are registered for ${selectedClassLabel} yet.` : "No voters registered yet. Add individually or bulk import above."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
