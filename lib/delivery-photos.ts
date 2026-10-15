import "server-only";
import { DomainError } from "@/lib/action";
import { db } from "@/lib/db";
import { PHOTO_EXTENSION, photoProblem } from "@/lib/domain/delivery-photo";

const BUCKET = "delivery-photos";

/** Returns the uploaded object path, or null when no photo was attached. */
export async function uploadDeliveryPhoto(orderId: number, value: FormDataEntryValue | null): Promise<string | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  const problem = photoProblem(value);
  if (problem) throw new DomainError(problem);
  const path = `${orderId}/${crypto.randomUUID()}.${PHOTO_EXTENSION[value.type]}`;
  const { error } = await db().storage.from(BUCKET).upload(path, value, { contentType: value.type });
  if (error) throw error;
  return path;
}

export async function removeDeliveryPhoto(path: string): Promise<void> {
  await db().storage.from(BUCKET).remove([path]);
}

/** Path -> signed URL, valid for an hour. */
export async function signDeliveryPhotos(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await db().storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  return new Map(data.flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
}
