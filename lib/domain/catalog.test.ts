import { describe, expect, it } from "vitest";
import { isImageRef, packCaption } from "./catalog";

describe("packCaption", () => {
  it.each([
    ["Kg", 1, "1 kg"],
    ["kg", 1, "1 kg"],
    ["Thùng", 10, "1 Thùng = 10 kg"],
    ["Bao", 25, "1 Bao = 25 kg"],
    ["Túi", 2.5, "1 Túi = 2,5 kg"],
  ])("%s of %s kg reads %s", (name, kg, caption) => {
    expect(packCaption({ name, kg_per_unit: kg })).toBe(caption);
  });
});

describe("isImageRef", () => {
  it.each(["/packs/kg.svg", "/products/mi-trung.svg", "https://cdn.example.com/a.png", "http://x.vn/b.jpg"])("accepts %s", (ref) => {
    expect(isImageRef(ref)).toBe(true);
  });
  it.each(["packs/kg.svg", "//evil.com/a.png", "javascript:alert(1)", "data:image/png;base64,AAAA", "/a b.png", "ftp://x/a.png", "", `/${"a".repeat(500)}`])(
    "rejects %s",
    (ref) => {
      expect(isImageRef(ref)).toBe(false);
    },
  );
});
