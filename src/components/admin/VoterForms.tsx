"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addVoter, bulkImportVoters, removeVoter, resetVoterActivation } from "@/lib/actions/admin";
import { Alert, Button, Card, Input, Label, Textarea } from "@/components/ui";

export type VoterRow = {
  id: string;
  name: string;
  indexNumber: string;
  email: string;
  activated: boolean;
  hasVoted: boolean;
};

export function AddVoterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [indexNumber, setIndexNumber] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    startTransition(async () => {
      const result = await addVoter({ name, indexNumber, email });
      if (result.ok) {
        setOk(true);
        setName("");
        setIndexNumber("");
        setEmail("");
        router.refresh();
      } else {
        setError(result.error || "Could not add voter.");
      }
    });
  }

  return (
    <Card>
      <h2 className="mb-4 font-semibold">Pre-register a voter</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="v-name">Full name</Label>
          <Input id="v-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Amina Bello" required />
        </div>
        <div>
          <Label htmlFor="v-index">Index number</Label>
          <Input
            id="v-index"
            value={indexNumber}
            onChange={(e) => setIndexNumber(e.target.value.toUpperCase())}
            placeholder="FCM.21.101.203.05"
            required
          />
        </div>
        <div>
          <Label htmlFor="v-email">School email</Label>
          <Input id="v-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cy-name1234@st.umat.edu.gh" required />
        </div>
        {error && <Alert kind="error">{error}</Alert>}
        {ok && <Alert kind="success">Voter added. They can now activate their account.</Alert>}
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add voter"}
        </Button>
      </form>
    </Card>
  );
}

export function BulkImportForm() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSummary(null);
    startTransition(async () => {
      const result = await bulkImportVoters({ csv });
      if (result.ok) {
        setSummary(result.summary || "Import complete.");
        setCsv("");
        router.refresh();
      } else {
        setError(result.error || "Import failed.");
      }
    });
  }

  return (
    <Card>
      <h2 className="mb-1 font-semibold">Bulk import voters</h2>
      <p className="mb-4 text-sm text-muted">
        One voter per line: <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">Full Name, Index Number, Email</code>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={7}
          placeholder={"Amina Bello, FCM.21.101.203.01, cs-amina1001@st.umat.edu.gh\nChidi Okeke, FCM.21.101.203.02, cs-chidi1002@st.umat.edu.gh"}
          className="font-mono text-xs"
          required
        />
        {error && <Alert kind="error">{error}</Alert>}
        {summary && <Alert kind={summary.includes("Issues") ? "info" : "success"}>{summary}</Alert>}
        <Button type="submit" disabled={pending}>
          {pending ? "Importing..." : "Import voters"}
        </Button>
      </form>
    </Card>
  );
}

export function VoterRowActions({ voter, isSuperAdmin }: { voter: VoterRow; isSuperAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-1">
      {!voter.hasVoted && voter.activated && (
        <Button
          variant="ghost"
          className="px-2 py-1 text-xs"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Reset activation for ${voter.name}? They will need a new code to set a password again.`)) {
              run(() => resetVoterActivation(voter.id));
            }
          }}
        >
          Reset
        </Button>
      )}
      {isSuperAdmin && !voter.hasVoted && (
        <Button
          variant="ghost"
          className="px-2 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Remove ${voter.name} (${voter.indexNumber}) from the voter register?`)) {
              run(() => removeVoter(voter.id));
            }
          }}
        >
          Remove
        </Button>
      )}
    </div>
  );
}
