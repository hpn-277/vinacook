import { describe, expect, it } from "vitest";
import { PHOTO_MAX_BYTES, photoProblem } from "./delivery-photo";

describe("delivery photo boundary", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s up to 5MB", (type) => {
    expect(photoProblem({ type, size: PHOTO_MAX_BYTES })).toBeNull();
  });

  it.each(["text/plain", "image/heic", "image/svg+xml", "application/pdf", ""])("rejects type %j", (type) => {
    expect(photoProblem({ type, size: 100 })).toBe("Ảnh phải là JPEG, PNG hoặc WebP");
  });

  it("rejects anything over 5MB", () => {
    expect(photoProblem({ type: "image/jpeg", size: PHOTO_MAX_BYTES + 1 })).toBe("Ảnh quá lớn (tối đa 5MB)");
  });
});
