"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { castBallot } from "@/lib/actions/vote";
import { Alert, Button, Card, Logo } from "@/components/ui";

export type BallotPosition = {
  id: string;
  name: string;
  candidates: { id: string; name: string; bio: string | null; photoUrl: string | null }[];
};

export default function Ballot({
  electionId,
  electionTitle,
  endsAt,
  positions,
}: {
  electionId: string;
  electionTitle: string;
  endsAt: string | null;
  positions: BallotPosition[];
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [votingOpen, setVotingOpen] = useState(true);
  const [statusUnavailable, setStatusUnavailable] = useState(true);
  const [statusChecked, setStatusChecked] = useState(false);
  const [pending, startTransition] = useTransition();
  const controlsDisabled = statusUnavailable || !statusChecked;

  const allSelected = positions.every((p) => selections[p.id]);

  useEffect(() => {
    let active = true;
    let statusTimer: ReturnType<typeof setTimeout> | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    function lockBallot() {
      if (!active) return;
      setVotingOpen(false);
      setConfirming(false);
      setSelections({});
      setError(null);
      router.refresh();
    }

    async function refreshVotingStatus() {
      try {
        const response = await fetch(`/api/elections/${encodeURIComponent(electionId)}/voting-status`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not verify whether voting is still open.");
        const payload: unknown = await response.json();
        if (payload === null || typeof payload !== "object" || !("open" in payload) || typeof payload.open !== "boolean") {
          throw new Error("The voting status response was invalid.");
        }

        if (!active) return;
        setStatusUnavailable(false);
        setStatusChecked(true);
        if (!payload.open) {
          lockBallot();
          return;
        }
        statusTimer = setTimeout(refreshVotingStatus, 1_000);
      } catch (cause) {
        if (!active || controller.signal.aborted) return;
        setStatusUnavailable(true);
        setError(cause instanceof Error ? cause.message : "Could not verify whether voting is still open.");
        statusTimer = setTimeout(refreshVotingStatus, 1_000);
      }
    }

    if (endsAt) {
      const remaining = new Date(endsAt).getTime() - Date.now();
      closeTimer = setTimeout(() => void refreshVotingStatus(), Math.max(0, remaining));
    }
    void refreshVotingStatus();

    return () => {
      active = false;
      controller.abort();
      if (statusTimer) clearTimeout(statusTimer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [electionId, endsAt, router]);

  if (!votingOpen) {
    return (
      <div role="status">
        <Card className="mx-auto max-w-xl p-8 text-center">
          <h2 className="font-display text-2xl">Voting is closed</h2>
          <p className="mt-2 text-sm text-muted">
            The election has ended. Ballots can no longer be started or submitted.
          </p>
          <Button className="mt-5" variant="secondary" onClick={() => router.refresh()}>
            Refresh
          </Button>
        </Card>
      </div>
    );
  }

  function submit() {
    if (!votingOpen || controlsDisabled) return;
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
        if (result.error?.toLowerCase().includes("closed") || result.error?.toLowerCase().includes("not open")) {
          setVotingOpen(false);
          setSelections({});
          router.refresh();
        }
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
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending || controlsDisabled} className="w-full sm:w-auto">
                Go back
              </Button>
              <Button onClick={submit} disabled={pending || controlsDisabled} className="w-full flex-1 shadow-lg shadow-emerald-500/20">
                {pending ? "Submitting securely..." : "Submit my vote"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="ballot-layout space-y-8">
      {error && <Alert kind="error">{error}</Alert>}
      {!statusChecked && !statusUnavailable && (
        <Alert kind="info">Checking whether voting is still open...</Alert>
      )}
      <div className="ballot-sheet">
        <header className="ballot-masthead">
          <div className="ballot-brand">
            <Logo compact />
            <div>
              <div className="ballot-brand-name">ACSES · UMAT</div>
              <div className="ballot-brand-caption">Association of Computer Science &amp; Engineering Students</div>
            </div>
          </div>
          <span className="ballot-official-mark">Official ballot</span>
        </header>

        <div className="ballot-title-block">
          <div className="ballot-eyebrow">Student elections</div>
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">{electionTitle}</h2>
          <p>Mark one candidate for each position. Your selections are private and final.</p>
        </div>

        <div className="ballot-positions">
          {positions.map((position, i) => (
            <section key={position.id} className="ballot-position">
              <div className="ballot-position-heading">
                <span className="ballot-position-number">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-display text-2xl tracking-tight">{position.name}</h3>
                  <p>Select one candidate</p>
                </div>
                <span className="ballot-mark-note">ONE CHOICE</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {position.candidates.map((c) => {
                  const selected = selections[position.id] === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={controlsDisabled}
                      aria-pressed={selected}
                      onClick={() => {
                        if (!votingOpen || controlsDisabled) return;
                        setSelections((s) => ({ ...s, [position.id]: selected ? "" : c.id }));
                      }}
                      className={`ballot-candidate flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                        selected
                          ? "border-accent bg-accent-soft shadow-md ring-1 ring-accent"
                          : "border-line bg-card hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card"
                      }`}
                    >
                      {c.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.photoUrl}
                          alt=""
                          className={`h-14 w-14 shrink-0 rounded-full object-cover shadow-sm transition-transform duration-300 ${selected ? "scale-105 ring-4 ring-accent/20" : ""}`}
                        />
                      ) : (
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold transition-transform duration-300 ${selected ? "scale-105 bg-accent text-white ring-4 ring-accent/20 dark:text-background" : "bg-surface text-muted"}`}>
                          {c.name
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className={`block font-bold tracking-tight ${selected ? "text-accent-contrast" : "text-foreground"}`}>
                          {c.name}
                        </span>
                        {c.bio ? (
                          <span className="mt-1 block text-xs text-muted line-clamp-2">{c.bio}</span>
                        ) : (
                          <span className="mt-1 block text-xs italic text-faint">No biography provided</span>
                        )}
                      </span>
                      <span className={`ballot-selection-mark flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${selected ? "border-accent bg-accent" : "border-line"}`}>
                        {selected && (
                          <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5 text-white dark:text-background">
                            <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                })}
                {position.candidates.length === 0 && (
                  <p className="text-sm text-muted">No candidates have been listed for this position.</p>
                )}
              </div>
            </section>
          ))}
        </div>

        <footer className="ballot-paper-footer">
          <span>ACSES · University of Mines and Technology</span>
          <span>Keep your vote private</span>
        </footer>
      </div>

      <div className="sticky bottom-4 z-20 mt-12 animate-rise" style={{ animationDelay: '200ms' }}>
        <Card className="flex flex-wrap items-center justify-between gap-4 border border-accent/40 bg-card/95 p-4 shadow-pop backdrop-blur-xl sm:p-5">
          <div className="text-sm text-muted">
            <span className="font-semibold text-foreground">
              {positions.filter((p) => selections[p.id]).length}/{positions.length}
            </span>{" "}
            positions selected — {electionTitle}
          </div>
          <Button
            disabled={!allSelected || pending || controlsDisabled}
            onClick={() => {
              if (controlsDisabled) return;
              setConfirming(true);
            }}
          >
            Review &amp; submit
          </Button>
        </Card>
      </div>
    </div>
  );
}
