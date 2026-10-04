"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAdminUser, toggleAdminActive } from "@/lib/actions/admin";
import { Alert, Button, Card, Input, Label, Select } from "@/components/ui";

export function AddAdminForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SUPERADMIN">("ADMIN");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    startTransition(async () => {
      const result = await createAdminUser({ name, email, password, role });
      if (result.ok) {
        setOk(true);
        setName("");
        setEmail("");
        setPassword("");
        setRole("ADMIN");
        router.refresh();
      } else {
        setError(result.error || "Could not create admin.");
      }
    });
  }

  return (
    <Card>
      <h2 className="mb-4 font-semibold">Add an administrator</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="a-name">Full name</Label>
          <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="a-email">Email</Label>
          <Input id="a-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="a-password">Temporary password</Label>
          <Input
            id="a-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 chars, letter + number"
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <Label htmlFor="a-role">Role</Label>
          <Select id="a-role" value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "SUPERADMIN")}>
            <option value="ADMIN">Admin — manage elections, voters; view results</option>
            <option value="SUPERADMIN">Superadmin — everything, incl. managing admins</option>
          </Select>
        </div>
        {error && <Alert kind="error">{error}</Alert>}
        {ok && <Alert kind="success">Administrator created.</Alert>}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create administrator"}
        </Button>
      </form>
    </Card>
  );
}

export function ToggleAdminButton({
  userId,
  active,
  isSelf,
}: {
  userId: string;
  active: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant={active ? "danger" : "secondary"}
      className="px-3 py-1 text-xs"
      disabled={pending || isSelf}
      title={isSelf ? "You cannot deactivate your own account" : undefined}
      onClick={() => {
        if (!active || window.confirm("Deactivate this administrator? They will lose access immediately.")) {
          startTransition(async () => {
            await toggleAdminActive(userId);
            router.refresh();
          });
        }
      }}
    >
      {active ? "Deactivate" : "Activate"}
    </Button>
  );
}
