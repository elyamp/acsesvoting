import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Badge, Card, PageHeader } from "@/components/ui";
import ElectionForm from "@/components/admin/ElectionForm";
import ElectionManager, { PositionManager } from "@/components/admin/ElectionManager";

export const dynamic = "force-dynamic";

export default async function ElectionDetailPage(props: PageProps<"/admin/elections/[id]">) {
  const { id } = await props.params;
  const session = await getSession();
  if (!session || session.kind !== "admin") notFound();

  const election = await prisma.election.findUnique({
    where: { id },
    include: {
      positions: { orderBy: { order: "asc" }, include: { candidates: true } },
      _count: { select: { votes: true } },
    },
  });
  if (!election) notFound();

  const isDraft = election.status === "DRAFT";

  return (
    <div>
      <PageHeader
        title={election.title}
        sub={
          election.description || undefined
        }
      >
        <div className="flex items-center gap-2">
          <Badge
            tone={election.status === "OPEN" ? "green" : election.status === "CLOSED" ? "red" : "amber"}
          >
            {election.status}
          </Badge>
          <Badge>{election._count.votes} votes</Badge>
        </div>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <ElectionManager
            election={{
              id: election.id,
              title: election.title,
              status: election.status,
              startsAt: election.startsAt,
            }}
            isSuperAdmin={session.role === "SUPERADMIN"}
          />
          <PositionManager
            electionId={election.id}
            isDraft={isDraft}
            positions={election.positions.map((p) => ({
              id: p.id,
              name: p.name,
              order: p.order,
              candidates: p.candidates.map((c) => ({
                id: c.id,
                name: c.name,
                bio: c.bio,
                photoUrl: c.photoUrl,
              })),
            }))}
          />
        </div>

        <div className="space-y-6">
          {isDraft && (
            <ElectionForm
              key={`${election.id}:${election.title}:${election.description ?? ""}:${election.startsAt?.getTime() ?? ""}:${election.endsAt?.getTime() ?? ""}`}
              election={election}
            />
          )}
          {!isDraft && (
            <Card>
              <h3 className="mb-2 font-semibold">Election details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Opens</dt>
                  <dd>{election.startsAt ? new Date(election.startsAt).toLocaleString() : "Immediately when opened"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Closes</dt>
                  <dd>{election.endsAt ? new Date(election.endsAt).toLocaleString() : "Manually closed"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Positions</dt>
                  <dd>{election.positions.length}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted">
                Details can only be edited while the election is a draft.
                {election.status === "OPEN"
                  ? election.endsAt
                    ? " Voting closes automatically at the scheduled time."
                    : " Remember to close voting manually."
                  : " This election is closed and cannot be reopened."}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
