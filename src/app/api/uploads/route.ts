import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Signature -> canonical extension. We trust the bytes, not the client's
// declared filename or content-type, so the stored extension is always safe.
const SIGNATURES: { ext: string; mime: string; test: (b: Buffer) => boolean }[] = [
  {
    ext: "jpg",
    mime: "image/jpeg",
    test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "png",
    mime: "image/png",
    test: (b) =>
      b.length > 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    ext: "webp",
    mime: "image/webp",
    test: (b) =>
      b.length > 12 &&
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.kind !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart form upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The selected file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const match = SIGNATURES.find((s) => s.test(bytes));
  if (!match) {
    return NextResponse.json(
      { error: "Unsupported image. Use a JPEG, PNG, or WebP file." },
      { status: 415 }
    );
  }

  const filename = `${randomUUID()}.${match.ext}`;
  const { env } = getCloudflareContext();
  await env.CANDIDATE_PHOTOS.put(filename, bytes, {
    httpMetadata: { contentType: match.mime },
  });

  const url = `/api/uploads/${filename}`;
  await audit("CANDIDATE_PHOTO_UPLOADED", { userId: session.sub, detail: url });

  return NextResponse.json({ url, mime: match.mime, bytes: file.size });
}
