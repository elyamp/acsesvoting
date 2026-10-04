"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { requestOtp, activateAccount } from "@/lib/actions/auth";
import { Alert, Button, Card, Input, Label } from "@/components/ui";

export default function ActivateForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [indexNumber, setIndexNumber] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await requestOtp({ indexNumber, email });
      if (result.ok) {
        setStep(2);
        setInfo(`We sent a 6-digit code to ${email}. It expires in 10 minutes.`);
      } else {
        setError(result.error || "Could not send code.");
      }
    });
  }

  function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    startTransition(async () => {
      const result = await activateAccount({ indexNumber, email, code, password });
      if (result.ok && result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      } else {
        setError(result.error || "Activation failed.");
      }
    });
  }

  return (
    <Card className="w-full max-w-md p-6 sm:p-8">
      <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
        <span className={step === 1 ? "text-accent" : ""}>1 · Identity</span>
        <span className="text-line">/</span>
        <span className={step === 2 ? "text-accent" : ""}>2 · Password</span>
      </div>
      <h2 className="mb-1 text-lg font-semibold">
        {step === 1 ? "Verify your identity" : "Set your password"}
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        {step === 1
          ? "Enter the index number and school email the electoral committee registered for you."
          : `Enter the code sent to ${email} and choose a password.`}
      </p>

      {step === 1 ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <Label htmlFor="a-index">Index Number</Label>
            <Input
              id="a-index"
              value={indexNumber}
              onChange={(e) => setIndexNumber(e.target.value.toUpperCase())}
              placeholder="FCM.21.101.203.05"
              required
            />
          </div>
          <div>
            <Label htmlFor="a-email">School Email</Label>
            <Input
              id="a-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cy-name1234@st.umat.edu.gh"
              required
            />
          </div>
          {error && <Alert kind="error">{error}</Alert>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Sending code..." : "Send activation code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleActivate} className="space-y-4">
          {info && <Alert kind="info">{info}</Alert>}
          <div>
            <Label htmlFor="a-code">6-digit code</Label>
            <Input
              id="a-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
          </div>
          <div>
            <Label htmlFor="a-pass">New password</Label>
            <Input
              id="a-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 chars, with a letter and a number"
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <Label htmlFor="a-confirm">Confirm password</Label>
            <Input
              id="a-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          {error && <Alert kind="error">{error}</Alert>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={pending}>
              Back
            </Button>
            <Button type="submit" disabled={pending || code.length !== 6} className="flex-1">
              {pending ? "Activating..." : "Activate & sign in"}
            </Button>
          </div>
          <button
            type="button"
            className="w-full text-center text-xs text-muted hover:text-foreground"
            onClick={handleRequestOtp}
            disabled={pending}
          >
            Resend code
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-muted">
        Already activated?{" "}
        <Link href="/login" className="font-medium text-accent-contrast hover:opacity-80">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
