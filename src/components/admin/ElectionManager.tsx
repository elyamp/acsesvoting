"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setElectionStatus,
  deleteElection,
  createPosition,
  deletePosition,
  createCandidate,
  deleteCandidate,
} from "@/lib/actions/admin";
import { Alert, Badge, Button, Card, Input, Label } from "@/components/ui";
import PhotoUpload from "@/components/admin/PhotoUpload";

type Position = {
  id: string;
  name: string;
  order: number;
  candidates: { id: string; name: string; bio: string | null; photoUrl: string | null }[];
};

export default function ElectionManager({
  election,
  isSuperAdmin,
}: {
  election: { id: string; title: string; status: string; startsAt: Date | null };
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isDraft = election.status === "DRAFT";

  function run(fn: () => Promise<{ ok: boolean; error?: string; redirectTo?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error || "Action failed.");
        return;
      }
      if (result.redirectTo) router.push(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && <Alert kind="error">{error}</Alert>}
      {isDraft && (
        <p className="text-sm text-muted">
          Set up every position with at least two candidates, add candidate photos, choose automatic or manual closing, then open voting.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {election.status !== "OPEN" && (
          <Button
            disabled={pending || election.status === "CLOSED"}
            onClick={() => {
              if (election.status === "CLOSED") {
                setError("Closed elections cannot be reopened.");
                return;
              }
              const openingMessage = election.startsAt
                ? `Open "${election.title}" now? Students can vote from the scheduled start time.`
                : `Open "${election.title}" for voting now? Students will be able to vote immediately.`;
              if (window.confirm(openingMessage)) {
                run(() => setElectionStatus(election.id, "OPEN"));
              }
            }}
          >
            Open voting
          </Button>
        )}
        {election.status === "OPEN" && (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Close voting? No more ballots will be accepted. This cannot be undone.")) {
                run(() => setElectionStatus(election.id, "CLOSED"));
              }
            }}
          >
            Close voting
          </Button>
        )}
        {isDraft && isSuperAdmin && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Delete this draft election and all its positions/candidates?")) {
                run(() => deleteElection(election.id));
              }
            }}
          >
            Delete election
          </Button>
        )}
      </div>
    </div>
  );
}

export function PositionManager({
  electionId,
  positions,
  isDraft,
}: {
  electionId: string;
  positions: Position[];
  isDraft: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [posName, setPosName] = useState("");
  const [posOrder, setPosOrder] = useState(String(positions.length + 1));
  const [candidateForms, setCandidateForms] = useState<Record<string, { name: string; bio: string; photoUrl: string }>>({});

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error || "Action failed.");
      else router.refresh();
    });
  }

  function addPosition(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const r = await createPosition({ electionId, name: posName, order: Number(posOrder) || 0 });
      if (r.ok) {
        setPosName("");
        setPosOrder(String(positions.length + 2));
      }
      return r;
    });
  }

  function addCandidate(positionId: string, e: React.FormEvent) {
    e.preventDefault();
    const form = candidateForms[positionId] || { name: "", bio: "", photoUrl: "" };
    run(async () => {
      const r = await createCandidate({ positionId, ...form });
      if (r.ok) setCandidateForms((f) => ({ ...f, [positionId]: { name: "", bio: "", photoUrl: "" } }));
      return r;
    });
  }

  return (
    <div className="space-y-4">
      {error && <Alert kind="error">{error}</Alert>}

      {isDraft && (
        <Card>
          <h3 className="mb-3 font-semibold">Add a position</h3>
          <form onSubmit={addPosition} className="flex flex-wrap items-end gap-3">
            <div className="min-w-52 flex-1">
              <Label htmlFor="pos-name">Position name</Label>
              <Input
                id="pos-name"
                value={posName}
                onChange={(e) => setPosName(e.target.value)}
                placeholder="e.g. Treasurer"
                required
              />
            </div>
            <div className="w-24">
              <Label htmlFor="pos-order">Order</Label>
              <Input
                id="pos-order"
                type="number"
                min={0}
                value={posOrder}
                onChange={(e) => setPosOrder(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={pending || !posName.trim()}>
              Add position
            </Button>
          </form>
        </Card>
      )}

      {positions.map((p) => {
        const form = candidateForms[p.id] || { name: "", bio: "", photoUrl: "" };
        const setForm = (patch: Partial<typeof form>) =>
          setCandidateForms((f) => ({ ...f, [p.id]: { ...form, ...patch } }));
        return (
          <Card key={p.id}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold">{p.name}</h3>
              <div className="flex items-center gap-2">
                <Badge tone={p.candidates.length >= 2 ? "green" : "amber"}>
                  {p.candidates.length} candidate{p.candidates.length === 1 ? "" : "s"}
                </Badge>
                {isDraft && (
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`Delete position "${p.name}" and its candidates?`)) {
                        run(() => deletePosition(p.id));
                      }
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>

            <ul className="mb-4 divide-y divide-line rounded-lg border border-line">
              {p.candidates.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted">No candidates yet.</li>
              )}
              {p.candidates.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    {c.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.photoUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-bold text-accent-contrast">
                        {c.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.name}</div>
                      {c.bio && <div className="truncate text-xs text-muted">{c.bio}</div>}
                    </div>
                  </div>
                  {isDraft && (
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      disabled={pending}
                      onClick={() => {
                        if (window.confirm(`Remove candidate "${c.name}"?`)) {
                          run(() => deleteCandidate(c.id));
                        }
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>

            {isDraft && (
              <form onSubmit={(e) => addCandidate(p.id, e)} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <div>
                  <Label>Candidate name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ name: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div>
                  <Label>Bio / manifesto (optional)</Label>
                  <Input
                    value={form.bio}
                    onChange={(e) => setForm({ bio: e.target.value })}
                    placeholder="Short bio"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={pending || !form.name.trim()}>
                    Add candidate
                  </Button>
                </div>
                <div className="sm:col-span-3">
                  <Label>Candidate photo (optional)</Label>
                  <PhotoUpload
                    value={form.photoUrl}
                    onChange={(url) => setForm({ photoUrl: url })}
                    disabled={pending}
                  />
                </div>
              </form>
            )}
          </Card>
        );
      })}

      {!isDraft && positions.length === 0 && (
        <p className="text-sm text-muted">No positions in this election.</p>
      )}
    </div>
  );
}
