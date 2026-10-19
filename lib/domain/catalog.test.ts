import { describe, expect, it } from "vitest";
import { isImageRef, loadList, packCaption, packGroupLabels } from "./catalog";

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

describe("loadList", () => {
  const item = (product: string, pack_name: string, pack_qty: number, unitKg: number) => ({ pack_name, pack_qty, qty_kg: pack_qty * unitKg, products: { name: product } });

  it("sums packs of the same name and size across orders, keeps sizes apart, biggest product first", () => {
    const lines = loadList([
      item("Bún tươi", "Cây", 1, 5),
      item("Mì trứng", "Thùng", 1, 15),
      item("Mì trứng", "Thùng", 2, 5),
      item("Mì trứng", "Thùng", 1, 15),
      item("Mì trứng", "Bao", 1, 30),
    ]);
    expect(lines).toEqual([
      { product: "Mì trứng", kg: 70, packs: ["1 Bao 30 kg", "2 Thùng 15 kg", "2 Thùng 5 kg"] },
      { product: "Bún tươi", kg: 5, packs: ["1 Cây 5 kg"] },
    ]);
  });

  it("reads old loose-kg lines as kg", () => {
    expect(loadList([item("Mì quảng", "Kg", 3, 1)])[0].packs).toEqual(["3 kg"]);
  });
});

describe("packGroupLabels", () => {
  it("merges sizes of one pack name, in size order", () => {
    const packs = [
      { name: "Bao", kg_per_unit: 30 },
      { name: "Thùng", kg_per_unit: 15 },
      { name: "Cây", kg_per_unit: 5 },
      { name: "Thùng", kg_per_unit: 5 },
      { name: "Thùng", kg_per_unit: 10 },
    ];
    expect(packGroupLabels(packs)).toEqual(["Cây 5 kg", "Thùng 5/10/15 kg", "Bao 30 kg"]);
  });
  it("is empty for a product with no packs", () => {
    expect(packGroupLabels([])).toEqual([]);
  });
});
