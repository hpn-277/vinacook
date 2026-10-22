import type { Bucket } from "../http";
import { DomainError } from "@noodle/core/action";
import { PHOTO_EXTENSION, photoProblem } from "@noodle/core/domain/delivery-photo";
import { fileUrl } from "@noodle/core/files";

/** Returns the public URL of the uploaded image, or null when no file was picked. */
export async function uploadProductImage(bucket: Bucket, value: File | string | null): Promise<string | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  const problem = photoProblem(value);
  if (problem) throw new DomainError(problem);
  const path = `${crypto.randomUUID()}.${PHOTO_EXTENSION[value.type]}`;
  await bucket.put(`products/${path}`, await value.arrayBuffer(), { httpMetadata: { contentType: value.type } });
  return fileUrl("products", path);
}
