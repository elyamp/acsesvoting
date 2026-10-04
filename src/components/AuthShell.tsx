import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";

const points = [
  "Secret, unlinkable ballots",
  "One student, one vote — enforced",
  "Official ACSES electoral platform",
];

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="hero-mesh relative flex flex-1">
      <div className="grid-lines absolute inset-0" aria-hidden />
      <div className="grain absolute inset-0" aria-hidden />

      <section className="relative hidden w-[42%] flex-col justify-between border-r border-line/60 bg-accent px-10 py-10 text-white lg:flex dark:text-background">
        <Link href="/" className="inline-flex w-fit">
          <div className="flex items-center gap-2.5">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-white/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="ACSES Logo" className="h-full w-full object-contain p-0.5" />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-extrabold tracking-tight">ACSES</div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-contrast">
                Elections
              </div>
            </div>
          </div>
        </Link>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70 dark:text-background/65">
            University of Mines and Technology
          </p>
          <h2 className="font-display mt-3 max-w-sm text-4xl leading-tight">
            Vote with confidence.
          </h2>
          <ul className="mt-8 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm font-medium text-white/90 dark:text-background/85">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[11px]">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/60 dark:text-background/55">
          Association of Computer Science &amp; Engineering Students
        </p>
      </section>

      <section className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <div className="relative flex w-full max-w-md flex-col items-center">
          <Link href="/" className="animate-rise lg:hidden">
            <Logo />
          </Link>
          <h1 className="animate-rise mt-8 font-display text-3xl tracking-tight text-foreground lg:mt-0">
            {title}
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-muted">{subtitle}</p>
          <div className="animate-rise mt-8 w-full">{children}</div>
        </div>
      </section>
    </main>
  );
}
