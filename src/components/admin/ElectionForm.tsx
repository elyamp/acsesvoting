"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createElection, updateElection } from "@/lib/actions/admin";
import { Alert, Button, Card, Input, Label, Textarea } from "@/components/ui";

function toLocalInput(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ElectionForm({
  election,
}: {
  election?: { id: string; title: string; description: string | null; startsAt: Date | null; endsAt: Date | null };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(election?.title ?? "");
  const [description, setDescription] = useState(election?.description ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(election?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(election?.endsAt));
  const [closeMode, setCloseMode] = useState<"scheduled" | "manual">(
    election?.endsAt ? "scheduled" : "manual",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input = {
      title,
      description,
      startsAt: startsAt ? new Date(startsAt).toISOString() : "",
      endsAt: closeMode === "scheduled" && endsAt ? new Date(endsAt).toISOString() : "",
    };
    startTransition(async () => {
      const result = election
        ? await updateElection(election.id, input)
        : await createElection(input);
      if (result.ok) {
        if (result.redirectTo) {
          router.push(result.redirectTo);
        }
        router.refresh();
        if (!election) {
          setTitle("");
          setDescription("");
          setStartsAt("");
          setEndsAt("");
          setCloseMode("manual");
        }
      } else {
        setError(result.error || "Could not save election.");
      }
    });
  }

  return (
    <Card>
      <h2 className="mb-4 font-semibold">{election ? "Edit election" : "Create a new election"}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ACSES 2026 Executive Elections"
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Annual election of departmental executives"
          />
        </div>
        <div>
          <Label htmlFor="startsAt">Voting opens (optional)</Label>
          <Input id="startsAt" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <p className="mt-1 text-xs text-muted">Times use your device&apos;s local timezone.</p>
        </div>
        <fieldset className="space-y-3 rounded-xl border border-line p-4">
          <legend className="px-1 text-sm font-semibold">How should voting end?</legend>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="radio"
              name="closeMode"
              value="scheduled"
              checked={closeMode === "scheduled"}
              onChange={() => setCloseMode("scheduled")}
              className="mt-1 accent-[var(--accent)]"
            />
            <span>
              <span className="block font-medium">Close automatically at a scheduled time</span>
              <span className="mt-1 block text-xs text-muted">Voting ends at the selected local time. The cutoff is enforced exactly; the election status updates automatically shortly afterward.</span>
            </span>
          </label>
          {closeMode === "scheduled" && (
            <div className="pl-7">
              <Label htmlFor="endsAt">Voting closes</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
              />
            </div>
          )}
          <label className="flex items-start gap-3 text-sm">
            <input
              type="radio"
              name="closeMode"
              value="manual"
              checked={closeMode === "manual"}
              onChange={() => setCloseMode("manual")}
              className="mt-1 accent-[var(--accent)]"
            />
            <span>
              <span className="block font-medium">Close manually</span>
              <span className="mt-1 block text-xs text-muted">An administrator can close voting at any time using the Close voting button.</span>
            </span>
          </label>
        </fieldset>
        {error && <Alert kind="error">{error}</Alert>}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : election ? "Save changes" : "Create election"}
        </Button>
      </form>
    </Card>
  );
}
