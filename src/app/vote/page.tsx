import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";
import Ballot from "@/components/Ballot";
import { Card, Logo } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = { title: "Cast your vote" };
export const dynamic = "force-dynamic";

export default async function VotePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.kind === "admin") redirect("/admin");

  const voter = await prisma.voter.findUnique({ where: { id: session.sub } });
  if (!voter) redirect("/login");
  if (voter.hasVoted) redirect("/voted");

  const now = new Date();
  const election = await prisma.election.findFirst({
    where: {
      status: "OPEN",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    include: {
      positions: { orderBy: { order: "asc" }, include: { candidates: true } },
    },
  });

  return (
    <div className="hero-mesh relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] mix-blend-luminosity dark:opacity-[0.05]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-[80vh] w-[80vh] object-contain grayscale" />
      </div>
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <main className="relative mx-auto w-full max-w-4xl flex-1 px-4 py-8 lg:py-12">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-card/80 p-5 shadow-card backdrop-blur-xl sm:p-6">
          <div className="flex items-start gap-4">
            <Logo compact />
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">ACSES Elections</div>
              </div>
              <h1 className="font-display mt-1.5 text-2xl tracking-tight sm:text-3xl">
                {election ? election.title : "Ballot"}
              </h1>
              <p className="mt-1 text-sm text-muted">
                Signed in as <span className="font-medium text-foreground">{voter.name}</span>{" "}
                <span className="text-faint">({voter.indexNumber})</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        {!election ? (
          <div className="mx-auto mt-16 max-w-md animate-rise">
            <Card className="border-dashed p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-muted">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path
                    d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="font-display text-2xl">No election is currently open</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Voting has not started yet or has closed. Check back later — you will be able to vote here as soon as
                the electoral committee opens the ballot.
              </p>
            </Card>
          </div>
        ) : (
          <div className="animate-rise space-y-8">
            <Card className="border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-amber-700 dark:text-amber-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V9C20 7.89543 19.1046 7 18 7H6C4.89543 7 4 7.89543 4 9V19C4 20.1046 4.89543 21 6 21ZM9 7V5C9 3.34315 10.3431 2 12 2C13.6569 2 15 3.34315 15 5V7H9Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium leading-relaxed text-amber-950 dark:text-amber-200">
                  Your vote is secret and final. Ballots are stored without any link to your identity — only the fact
                  that you voted is recorded, so nobody can trace how you voted.
                </p>
              </div>
            </Card>
            <Ballot
              electionId={election.id}
              electionTitle={election.title}
              positions={election.positions.map((p) => ({
                id: p.id,
                name: p.name,
                candidates: p.candidates.map((c) => ({
                  id: c.id,
                  name: c.name,
                  bio: c.bio,
                  photoUrl: c.photoUrl,
                })),
              }))}
            />
          </div>
        )}
      </main>
    </div>
  );
}
