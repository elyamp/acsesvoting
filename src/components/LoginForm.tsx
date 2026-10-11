"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { voterLogin, adminLogin } from "@/lib/actions/auth";
import { Alert, Button, Card, Input, Label } from "@/components/ui";

export default function LoginForm() {
  const router = useRouter();
  const [indexNumber, setIndexNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = indexNumber.trim()
        ? await voterLogin({ indexNumber, email, password })
        : await adminLogin({ email, password });
      if (result.ok && result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      } else {
        setError(result.error || "Sign in failed.");
      }
    });
  }

  return (
    <Card className="auth-card w-full max-w-md p-4 sm:p-5">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="indexNumber">Index Number</Label>
          <Input
            id="indexNumber"
            value={indexNumber}
            onChange={(e) => setIndexNumber(e.target.value.toUpperCase())}
            placeholder="Index Number"
            autoComplete="username"
          />
        </div>
        <div>
          <Label htmlFor="email">Account email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Account email"
            autoComplete="username"
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
          />
        </div>

        {error && <Alert kind="error">{error}</Alert>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-3 text-center text-sm text-muted">
        First time voting?{" "}
        <Link href="/activate" className="font-medium text-accent-contrast hover:opacity-80">
          Activate your account
        </Link>
      </p>
    </Card>
  );
}
