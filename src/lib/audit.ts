import { prisma } from "./prisma";

export async function audit(
  action: string,
  opts: { detail?: string; userId?: string | null; electionId?: string | null } = {}
) {
  await prisma.auditLog.create({
    data: {
      action,
      detail: opts.detail,
      userId: opts.userId ?? null,
      electionId: opts.electionId ?? null,
    },
  });
}
