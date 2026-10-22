/** Top-level folders in the R2 bucket and who may read them through /files. */
export const FOLDER_ACCESS = { delivery: "staff", products: "public" } as const;
export type Folder = keyof typeof FOLDER_ACCESS;

export function fileUrl(folder: Folder, path: string): string {
  return `/files/${folder}/${path}`;
}

/** Staff-only URL; the API's /files route checks the login. */
export function deliveryPhotoUrl(path: string): string {
  return fileUrl("delivery", path);
}
