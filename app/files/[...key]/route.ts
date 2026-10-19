import { currentStaff } from "@/lib/auth";
import { FOLDER_ACCESS, getFile, type Folder } from "@/lib/files";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const access = FOLDER_ACCESS[key[0] as Folder];
  if (!access || key.length < 2) return new Response(null, { status: 404 });
  if (access === "staff" && !(await currentStaff())) return new Response(null, { status: 404 });

  const object = await getFile(key.join("/"));
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      ETag: object.httpEtag,
      // Keys are random UUIDs and never overwritten, so a cached copy never goes stale.
      "Cache-Control": access === "public" ? "public, max-age=31536000, immutable" : "private, max-age=3600",
    },
  });
}
