import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";
import AuthShell from "@/components/AuthShell";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session?.kind === "admin") redirect("/admin");
  if (session?.kind === "voter") redirect("/vote");

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to cast your ballot or manage elections">
      <LoginForm />
    </AuthShell>
  );
}
