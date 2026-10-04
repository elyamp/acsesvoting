"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { voterLogin, adminLogin } from "@/lib/actions/auth";
import { Alert, Button, Card, Input, Label } from "@/components/ui";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"student" | "admin">("student");
  const [indexNumber, setIndexNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        mode === "student"
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
    <Card className="w-full max-w-md p-6 sm:p-8">
      <div className="mb-7 grid grid-cols-2 rounded-xl bg-surface p-1 text-sm font-semibold">
        {(["student", "admin"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`rounded-lg px-3 py-1.5 capitalize transition-all ${
              mode === m
                ? "bg-card text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {m === "student" ? "Student" : "Admin"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "student" && (
          <div>
            <Label htmlFor="indexNumber">Index Number</Label>
            <Input
              id="indexNumber"
              value={indexNumber}
              onChange={(e) => setIndexNumber(e.target.value.toUpperCase())}
              placeholder="FCM.21.101.203.05"
              autoComplete="username"
              required
            />
            <p className="mt-1 text-xs text-muted">Format: FCM.00.000.000.00</p>
          </div>
        )}
        <div>
          <Label htmlFor="email">{mode === "student" ? "School Email" : "Admin Email"}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={mode === "student" ? "cy-name1234@st.umat.edu.gh" : "admin@acses.org"}
            autoComplete={mode === "student" ? "username" : "email"}
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
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        {error && <Alert kind="error">{error}</Alert>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      {mode === "student" && (
        <p className="mt-4 text-center text-sm text-muted">
          First time voting?{" "}
          <Link href="/activate" className="font-medium text-accent-contrast hover:opacity-80">
            Activate your account
          </Link>
        </p>
      )}
    </Card>
  );
}
