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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input = { title, description, startsAt, endsAt };
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="startsAt">Voting opens (optional)</Label>
            <Input id="startsAt" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="endsAt">Voting closes (optional)</Label>
            <Input id="endsAt" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>
        {error && <Alert kind="error">{error}</Alert>}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : election ? "Save changes" : "Create election"}
        </Button>
      </form>
    </Card>
  );
}
