/** Mirrors the `delivery-photos` bucket limits in supabase/migrations. */
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_EXTENSION: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Why this upload cannot be a delivery photo, or null when it can. */
export function photoProblem(file: { type: string; size: number }): string | null {
  if (!PHOTO_EXTENSION[file.type]) return "Ảnh phải là JPEG, PNG hoặc WebP";
  if (file.size > PHOTO_MAX_BYTES) return "Ảnh quá lớn (tối đa 5MB)";
  return null;
}
