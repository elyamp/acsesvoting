import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import ActivateForm from "@/components/ActivateForm";
import AuthShell from "@/components/AuthShell";

export const metadata: Metadata = { title: "Activate account" };
export const dynamic = "force-dynamic";

export default async function ActivatePage() {
  const session = await getSession();
  if (session) redirect(session.kind === "admin" ? "/admin" : "/vote");

  return (
    <AuthShell title="Activate your account" subtitle="Verify your student identity to unlock your ballot">
      <ActivateForm />
    </AuthShell>
  );
}
