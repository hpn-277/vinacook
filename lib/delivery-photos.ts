import "server-only";
import { DomainError } from "@/lib/action";
import { PHOTO_EXTENSION, photoProblem } from "@/lib/domain/delivery-photo";
import { deleteFile, fileUrl, putFile } from "@/lib/files";

/** Returns the stored photo path, or null when no photo was attached. */
export async function uploadDeliveryPhoto(orderId: number, value: FormDataEntryValue | null): Promise<string | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  const problem = photoProblem(value);
  if (problem) throw new DomainError(problem);
  const path = `${orderId}/${crypto.randomUUID()}.${PHOTO_EXTENSION[value.type]}`;
  await putFile("delivery", path, value);
  return path;
}

export async function removeDeliveryPhoto(path: string): Promise<void> {
  await deleteFile("delivery", path);
}

/** Staff-only URL; app/files/[...key]/route.ts checks the login. */
export function deliveryPhotoUrl(path: string): string {
  return fileUrl("delivery", path);
}
