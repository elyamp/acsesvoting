import { get } from "@vercel/blob";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, context: RouteContext<"/api/uploads/[filename]">) {
  const { filename } = await context.params;
  const match = /^([0-9a-f-]{36})\.(jpg|png|webp)$/i.exec(filename);
  if (!match) return new Response("Not found", { status: 404 });

  if (process.env.NODE_ENV !== "production") {
    let bytes: Buffer;
    try {
      bytes = await readFile(path.join(process.cwd(), "public", "uploads", filename));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return new Response("Not found", { status: 404 });
      }
      throw error;
    }

    const body = new Uint8Array(bytes.byteLength);
    body.set(bytes);
    return new Response(body, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": IMAGE_TYPES[match[2].toLowerCase()],
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const object = await get(filename, { access: "public" });
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.stream, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": object.blob.contentType || IMAGE_TYPES[match[2].toLowerCase()],
      "X-Content-Type-Options": "nosniff",
    },
  });
}
