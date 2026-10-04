"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { castBallot } from "@/lib/actions/vote";
import { Alert, Button, Card } from "@/components/ui";

export type BallotPosition = {
  id: string;
  name: string;
  candidates: { id: string; name: string; bio: string | null; photoUrl: string | null }[];
};

export default function Ballot({
  electionId,
  electionTitle,
  positions,
}: {
  electionId: string;
  electionTitle: string;
  positions: BallotPosition[];
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const allSelected = positions.every((p) => selections[p.id]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await castBallot({
        electionId,
        selections: positions.map((p) => ({ positionId: p.id, candidateId: selections[p.id] })),
      });
      if (result.ok && result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      } else {
        setConfirming(false);
        setError(result.error || "Could not submit your ballot.");
      }
    });
  }

  if (confirming) {
    return (
      <div className="mx-auto w-full max-w-md animate-rise">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-contrast">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="font-display text-3xl tracking-tight">Review your ballot</h2>
          <p className="mt-2 text-sm text-muted">
            Please verify your selections below. Once submitted, your vote is final and securely recorded.
          </p>
        </div>

        <Card className="overflow-hidden border-line bg-card p-0 shadow-pop">
          <div className="border-b border-line border-dashed bg-card px-6 py-4">
            <div className="text-center text-xs font-bold uppercase tracking-widest text-faint">
              Official Ballot Summary
            </div>
            <div className="mt-1 text-center text-sm font-semibold">{electionTitle}</div>
          </div>
          
          <ul className="divide-y divide-line/60 bg-card px-6 py-2">
            {positions.map((p) => {
              const c = p.candidates.find((c) => c.id === selections[p.id]);
              return (
                <li key={p.id} className="py-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted">{p.name}</div>
                  <div className="mt-1 flex items-center gap-3">
                    {c?.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover shadow-sm" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs font-bold text-muted">
                        {c?.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-base font-bold text-foreground">{c?.name}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          
          <div className="bg-surface px-6 py-4 dark:bg-surface/50">
            {error && (
              <div className="mb-4">
                <Alert kind="error">{error}</Alert>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending} className="w-full sm:w-auto">
                Go back
              </Button>
              <Button onClick={submit} disabled={pending} className="w-full flex-1 shadow-lg shadow-emerald-500/20">
                {pending ? "Submitting securely..." : "Submit my vote"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && <Alert kind="error">{error}</Alert>}
      {positions.map((position, i) => (
        <section key={position.id}>
          <div className="mb-3 flex items-baseline gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white dark:text-background">
              {i + 1}
            </span>
            <h2 className="font-display text-2xl tracking-tight">{position.name}</h2>
            <span className="text-xs text-muted">Select one candidate</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {position.candidates.map((c) => {
              const selected = selections[position.id] === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setSelections((s) => ({ ...s, [position.id]: selected ? "" : c.id }))
                  }
                  className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 ${
                    selected
                      ? "border-accent bg-accent-soft shadow-md ring-1 ring-accent"
                      : "border-line bg-card shadow-card hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-pop"
                  }`}
                >
                  {selected && (
                    <div className="absolute right-0 top-0 rounded-bl-xl bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white dark:text-background">
                      Selected
                    </div>
                  )}
                  <div className="flex w-full items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {c.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.photoUrl}
                          alt=""
                          className={`h-14 w-14 rounded-full object-cover shadow-sm transition-transform duration-300 ${selected ? 'scale-105 ring-4 ring-accent/20' : ''}`}
                        />
                      ) : (
                        <div className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold transition-transform duration-300 ${selected ? "scale-105 bg-accent text-white ring-4 ring-accent/20 dark:text-background" : "bg-surface text-muted"}`}>
                          {c.name
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                      )}
                      <div>
                        <div className={`font-bold tracking-tight ${selected ? 'text-accent-contrast' : 'text-foreground'}`}>{c.name}</div>
                        {c.bio ? (
                          <div className="mt-1 text-xs text-muted line-clamp-2">{c.bio}</div>
                        ) : (
                          <div className="mt-1 text-xs text-faint italic">No biography provided</div>
                        )}
                      </div>
                    </div>
                    <div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${selected ? 'border-accent bg-accent' : 'border-line bg-transparent'}`}>
                      {selected && (
                        <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5 text-white dark:text-background">
                          <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-4 z-20 mt-12 animate-rise" style={{ animationDelay: '200ms' }}>
        <Card className="flex flex-wrap items-center justify-between gap-4 border border-accent/40 bg-card/95 p-4 shadow-pop backdrop-blur-xl sm:p-5">
          <div className="text-sm text-muted">
            <span className="font-semibold text-foreground">
              {positions.filter((p) => selections[p.id]).length}/{positions.length}
            </span>{" "}
            positions selected — {electionTitle}
          </div>
          <Button disabled={!allSelected || pending} onClick={() => setConfirming(true)}>
            Review &amp; submit
          </Button>
        </Card>
      </div>
    </div>
  );
}
