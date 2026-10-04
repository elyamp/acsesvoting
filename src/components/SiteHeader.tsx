import Link from "next/link";
import { Logo } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";

export default function SiteHeader({
  showNav = true,
}: {
  showNav?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5 sm:px-6">
        <Link href="/" className="rounded-xl outline-offset-4">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {showNav && (
            <>
              <Link
                href="/activate"
                className="rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground sm:px-4"
              >
                Activate
              </Link>
              <Link
                href="/login"
                className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-opacity hover:opacity-90 dark:text-background"
              >
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
