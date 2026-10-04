"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui";

export default function LogoutButton({ label = "Sign out" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await logout();
          router.push(r.redirectTo || "/");
          router.refresh();
        })
      }
    >
      {label}
    </Button>
  );
}
