import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import SiteHeader from "@/components/SiteHeader";
import ScrollReveal from "@/components/ScrollReveal";

export const dynamic = "force-dynamic";

const steps = [
  {
    n: "01",
    title: "Get registered",
    body: "The electoral committee pre-registers every eligible student with their FCM index number and UMAT school email.",
  },
  {
    n: "02",
    title: "Activate securely",
    body: "Confirm your identity with a one-time code sent to your school email, then set your personal password.",
  },
  {
    n: "03",
    title: "Cast your ballot",
    body: "Pick your candidates for each position and submit. Your choices are encrypted in transit and stored anonymously.",
  },
];

const features = [
  {
    title: "Secret ballot",
    body: "Votes are stored with no link to your identity. Only the fact that you voted is recorded — nobody can trace your choices.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "One student, one vote",
    body: "The ballot box is enforced by the database itself — a second vote from the same student is cryptographically impossible.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path d="M4 7h16v13H4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 3h6v4H9zM10 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Live, auditable results",
    body: "Officials watch collation in real time and every administrative action is written to a tamper-evident audit log.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path d="M4 19V5m0 14h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 15l3.5-4 3 2.5L20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default async function Home() {
  const session = await getSession();
  if (session?.kind === "admin") redirect("/admin");
  if (session?.kind === "voter") redirect("/vote");

  const openElection = await prisma.election.findFirst({
    where: { status: "OPEN" },
    include: { positions: { orderBy: { order: "asc" }, include: { _count: { select: { candidates: true } } } } },
  });

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="home-hero hero-mesh relative overflow-hidden">
          <div
            className="home-hero-image absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/hero-2026.jpg')" }}
            aria-hidden
          />
          <div className="home-hero-scrim absolute inset-0" aria-hidden />
          <div className="grid-lines absolute inset-0" aria-hidden />
          <div className="grain absolute inset-0 opacity-50" aria-hidden />
          <div className="home-hero-inner relative mx-auto flex w-full max-w-6xl items-center px-5 py-12 sm:px-6 sm:py-16 lg:py-20">
            <div className="home-hero-copy">
              <div className="hero-kicker inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                ACSES · University of Mines and Technology
              </div>
              <h1 className="home-hero-title hero-title font-display mt-7">
                Your department.
                <br />
                <span className="bg-clip-text text-transparent">
                  Your vote. Your voice.
                </span>
              </h1>
              <p className="home-hero-description hero-description mt-6 text-base leading-relaxed sm:text-lg">
                The official ACSES online elections platform. Secure, anonymous, and built for every computer
                science &amp; engineering student.
              </p>
              <div className="hero-actions mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="hero-primary rounded-xl px-6 py-3.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-1"
                >
                  Sign in to vote
                </Link>
                <Link
                  href="/activate"
                  className="hero-secondary rounded-xl border px-6 py-3.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-1"
                >
                  Activate your account
                </Link>
              </div>
            </div>
          </div>
        </section>

        {openElection && (
          <section className="relative px-5 py-12 sm:px-6 z-10">
            <div className="mx-auto w-full max-w-3xl">
              <ScrollReveal>
                <div className="relative overflow-hidden rounded-[2rem] border border-accent/20 bg-card/90 p-8 shadow-pop backdrop-blur-2xl sm:p-10">
                  <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent-soft opacity-70 blur-3xl" aria-hidden />
                  <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent-soft opacity-70 blur-3xl" aria-hidden />

                  <div className="relative flex flex-col items-center justify-center text-center">
                    <div className="flex items-center justify-center gap-3">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
                      </span>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Voting is live</div>
                    </div>

                    <h2 className="font-display mt-4 text-3xl tracking-tight text-foreground sm:text-4xl">
                      {openElection.title}
                    </h2>
                    <p className="mt-3 text-sm text-muted sm:text-base">
                      The ballot is now officially open. Sign in to securely cast your vote and make your voice heard.
                    </p>

                    <div className="mt-8 grid w-full grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center">
                      {openElection.positions.slice(0, 4).map((p) => (
                        <div
                          key={p.id}
                          className="rounded-2xl border border-line bg-background/60 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent-line hover:shadow-card"
                        >
                          <div className="text-sm font-semibold text-foreground">{p.name}</div>
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-accent-contrast">
                            {p._count.candidates} candidate{p._count.candidates === 1 ? "" : "s"}
                          </div>
                        </div>
                      ))}
                    </div>
                    {openElection.positions.length > 4 && (
                      <div className="mt-4 text-center">
                        <span className="text-xs font-medium italic text-muted">
                          +{openElection.positions.length - 4} more positions on the ballot
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>
        )}

        <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Process</p>
            <h2 className="font-display mt-2 text-3xl tracking-tight text-foreground sm:text-4xl">How voting works</h2>
            <p className="mt-3 text-muted">Three steps from registration to a counted, anonymous ballot.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <ScrollReveal key={s.n} delay={(Number(s.n) - 1) * 110}>
                <Card className="p-6 transition-shadow hover:shadow-pop">
                  <div className="font-mono text-xs font-semibold tracking-widest text-gold">{s.n}</div>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="border-t border-line bg-surface/60">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Integrity</p>
              <h2 className="font-display mt-2 text-3xl tracking-tight text-foreground sm:text-4xl">Built to be trusted</h2>
              <p className="mt-3 text-muted">
                Elections only matter if everyone believes in them. Here is how the platform protects yours.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {features.map((f, index) => (
                <ScrollReveal key={f.title} delay={index * 110}>
                  <div className="ui-card rounded-2xl border border-line bg-card p-6 shadow-card">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      {f.icon}
                    </div>
                    <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-faint sm:px-6">
          <span>© {new Date().getFullYear()} ACSES · University of Mines and Technology</span>
        </div>
      </footer>
    </div>
  );
}
