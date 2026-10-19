import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Top-level folders in the R2 bucket and who may read them through /files. */
export const FOLDER_ACCESS = { delivery: "staff", products: "public" } as const;
export type Folder = keyof typeof FOLDER_ACCESS;

const bucket = () => getCloudflareContext().env.FILES;

export function fileUrl(folder: Folder, path: string): string {
  return `/files/${folder}/${path}`;
}

export async function putFile(folder: Folder, path: string, file: Blob): Promise<void> {
  await bucket().put(`${folder}/${path}`, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
}

export async function deleteFile(folder: Folder, path: string): Promise<void> {
  await bucket().delete(`${folder}/${path}`);
}

export async function getFile(key: string) {
  return bucket().get(key);
}
