import "server-only";
import { DomainError } from "@/lib/action";
import { PHOTO_EXTENSION, photoProblem } from "@/lib/domain/delivery-photo";
import { fileUrl, putFile } from "@/lib/files";

/** Returns the public URL of the uploaded image, or null when no file was picked. */
export async function uploadProductImage(value: FormDataEntryValue | null): Promise<string | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  const problem = photoProblem(value);
  if (problem) throw new DomainError(problem);
  const path = `${crypto.randomUUID()}.${PHOTO_EXTENSION[value.type]}`;
  await putFile("products", path, value);
  return fileUrl("products", path);
}
