import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

const IMAGE_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, context: RouteContext<"/api/uploads/[filename]">) {
  const { filename } = await context.params;
  const match = /^([0-9a-f-]{36})\.(jpg|png|webp)$/i.exec(filename);
  if (!match) return new Response("Not found", { status: 404 });

  const object = await getCloudflareContext().env.CANDIDATE_PHOTOS.get(filename);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": IMAGE_TYPES[match[2].toLowerCase()],
      "X-Content-Type-Options": "nosniff",
    },
  });
}
