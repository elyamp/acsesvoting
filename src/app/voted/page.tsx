import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";
import { Card, Logo } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = { title: "Vote received" };
export const dynamic = "force-dynamic";

export default async function VotedPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.kind === "admin") redirect("/admin");

  const voter = await prisma.voter.findUnique({ where: { id: session.sub } });
  if (!voter) redirect("/login");
  if (!voter.hasVoted) redirect("/vote");

  return (
    <main className="hero-mesh relative mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="grid-lines absolute inset-0" aria-hidden />
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="relative z-10 flex flex-col items-center">
        <Logo />
        <div className="animate-check mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft text-accent shadow-card ring-1 ring-accent-line">
          <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="font-display mt-6 text-3xl tracking-tight sm:text-4xl">Your vote has been recorded</h1>
        <Card className="mt-6 w-full text-left">
          <p className="text-sm leading-relaxed text-muted">
            Thank you, <span className="font-semibold text-foreground">{voter.name}</span>. Your ballot was cast
            successfully and counted anonymously. Each student may vote only once — this account is now marked as
            having voted.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Official results will be published by the ACSES Electoral Committee after voting closes.
          </p>
        </Card>
        <div className="mt-6">
          <LogoutButton label="Sign out" />
        </div>
      </div>
    </main>
  );
}
