import { getSession, isSameOriginRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { voterClassValues, voterClassLabel } from "@/lib/voter-classes";

const voterClassSet = new Set<string>(voterClassValues);

function csvCell(value: string) {
  const safeValue = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const requestOrigin = request.headers.get("origin") ?? request.headers.get("referer");
  const requestHost = new URL(request.url).host;
  if (!isSameOriginRequest(requestOrigin, null, requestHost)) {
    return Response.json({ error: "Request origin is not trusted." }, { status: 403 });
  }

  const session = await getSession();
  if (!session || session.kind !== "admin") {
    return Response.json({ error: "Admin access required." }, { status: 401 });
  }

  const requestedClass = new URL(request.url).searchParams.get("classGroup");
  if (
    !requestedClass ||
    (requestedClass !== "all" &&
      requestedClass !== "UNASSIGNED" &&
      !voterClassSet.has(requestedClass))
  ) {
    return Response.json({ error: "Choose a valid class register." }, { status: 400 });
  }

  const voters = await prisma.voter.findMany({
    where: requestedClass === "all" ? undefined : { classGroup: requestedClass },
    orderBy: [{ classGroup: "asc" }, { indexNumber: "asc" }],
    select: { classGroup: true, name: true, indexNumber: true, email: true },
  });

  const includeClass = requestedClass === "all";
  const rows = [
    (includeClass
      ? ["Class", "Full Name", "Index Number", "Email"]
      : ["Full Name", "Index Number", "Email"])
      .map(csvCell)
      .join(","),
    ...voters.map((voter) =>
      (includeClass
        ? [voterClassLabel(voter.classGroup), voter.name, voter.indexNumber, voter.email]
        : [voter.name, voter.indexNumber, voter.email]
      )
        .map(csvCell)
        .join(","),
    ),
  ];
  const filename = `acses-voters-${requestedClass.toLowerCase()}.csv`;

  return new Response(`\uFEFF${rows.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
