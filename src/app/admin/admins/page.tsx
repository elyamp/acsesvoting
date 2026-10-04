import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Badge, Card, PageHeader } from "@/components/ui";
import { AddAdminForm, ToggleAdminButton } from "@/components/admin/AdminForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administrators" };

export default async function AdminsPage() {
  const session = await getSession();
  if (!session || session.kind !== "admin") redirect("/login");
  if (session.role !== "SUPERADMIN") redirect("/admin");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <PageHeader title="Administrators" sub="Superadmin only — manage who can run elections" />
      <div className="grid gap-6 xl:grid-cols-2">
        <AddAdminForm />
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface/70 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.role === "SUPERADMIN" ? "green" : "blue"}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.active ? "green" : "red"}>{u.active ? "Active" : "Disabled"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ToggleAdminButton userId={u.id} active={u.active} isSelf={u.id === session.sub} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
