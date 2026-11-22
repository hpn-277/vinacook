import { describe, expect, it } from "vitest";
import { phone, destination } from "../form";
import { deliveryArea, dialable, formatDestination, type Destination } from "./destination";

const au: Destination = {
  country: "AU",
  region: "NSW",
  district: "Yagoona",
  postcode: "2199",
  address: "7 Glassop St",
  company: "KHOUSE PTY LTD",
};

describe("destination", () => {
  it("accepts the Yagoona example and formats it on one line", () => {
    const d = destination.parse({ ...au, company: "KHOUSE PTY LTD" });
    expect(formatDestination(d)).toBe("KHOUSE PTY LTD, 7 Glassop St, Yagoona NSW 2199, Australia");
    expect(deliveryArea(d)).toBe("NSW, Australia");
  });

  it("needs a 4-digit postcode in Australia", () => {
    expect(destination.safeParse({ ...au, postcode: "219" }).error?.issues[0].message).toBe("Postcode gồm 4 số");
  });

  it("HCMC must use a dispatch district; other provinces take free text", () => {
    const vn = { country: "VN", region: "TP. Hồ Chí Minh", district: "Quận 5", address: "12 Trần Hưng Đạo", postcode: "9999", company: "" };
    const ok = destination.parse(vn);
    expect([ok.postcode, ok.company, deliveryArea(ok)]).toEqual([null, null, "Quận 5"]);
    expect(destination.safeParse({ ...vn, district: "Phường Bến Nghé" }).success).toBe(false);
    const hn = destination.parse({ ...vn, region: "Hà Nội", district: "Phường Hoàn Kiếm" });
    expect([formatDestination(hn), deliveryArea(hn)]).toEqual(["12 Trần Hưng Đạo, Phường Hoàn Kiếm, Hà Nội", "Hà Nội"]);
    expect(destination.safeParse({ ...vn, region: "Bình Dương" }).error?.issues[0].message).toBe("Chọn tỉnh/thành");
  });
});

describe("phone", () => {
  it.each([
    ["0414 578 383", "0414578383"],
    ["+61 414 578 383", "0414578383"],
    ["+84 912 345 678", "0912345678"],
    ["0901.000.001", "0901000001"],
  ])("%s -> %s", (raw, stored) => expect(phone.parse(raw)).toBe(stored));

  it("dials AU numbers with +61", () => {
    expect(dialable("0414578383", "AU")).toBe("+61414578383");
    expect(dialable("0901000001", "VN")).toBe("0901000001");
  });
});
