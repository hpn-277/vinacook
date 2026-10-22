import type { Bucket } from "../http";
import { DomainError } from "@noodle/core/action";
import { PHOTO_EXTENSION, photoProblem } from "@noodle/core/domain/delivery-photo";

/** Returns the stored photo path, or null when no photo was attached. */
export async function uploadDeliveryPhoto(bucket: Bucket, orderId: number, value: File | string | null): Promise<string | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  const problem = photoProblem(value);
  if (problem) throw new DomainError(problem);
  const path = `${orderId}/${crypto.randomUUID()}.${PHOTO_EXTENSION[value.type]}`;
  await bucket.put(`delivery/${path}`, await value.arrayBuffer(), { httpMetadata: { contentType: value.type } });
  return path;
}

export async function removeDeliveryPhoto(bucket: Bucket, path: string): Promise<void> {
  await bucket.delete(`delivery/${path}`);
}
