import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/admin/Sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.kind !== "admin") redirect("/vote");

  return (
    <div className="hero-mesh relative flex min-h-screen flex-col lg:flex-row">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-40 dark:opacity-20" aria-hidden />
      <Sidebar name={session.name} role={session.role || "ADMIN"} />
      <main className="relative z-10 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
