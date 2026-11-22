import { DISTRICTS } from "./districts";

/** Where an order goes: anywhere in Việt Nam, or Australia. */
export const COUNTRY_LABEL = { VN: "Việt Nam", AU: "Australia" } as const;
export type Country = keyof typeof COUNTRY_LABEL;
export const COUNTRIES = Object.keys(COUNTRY_LABEL) as Country[];

export const HCMC = "TP. Hồ Chí Minh";

/** The 34 tỉnh/thành after the 1/7/2025 merger; HCMC first since most orders are local. */
export const VN_PROVINCES = [
  HCMC,
  "Hà Nội",
  "Hải Phòng",
  "Đà Nẵng",
  "Huế",
  "Cần Thơ",
  "An Giang",
  "Bắc Ninh",
  "Cà Mau",
  "Cao Bằng",
  "Đắk Lắk",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Tĩnh",
  "Hưng Yên",
  "Khánh Hòa",
  "Lai Châu",
  "Lạng Sơn",
  "Lào Cai",
  "Lâm Đồng",
  "Nghệ An",
  "Ninh Bình",
  "Phú Thọ",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sơn La",
  "Tây Ninh",
  "Thái Nguyên",
  "Thanh Hóa",
  "Tuyên Quang",
  "Vĩnh Long",
] as const;

export const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

export type Destination = {
  country: Country;
  /** Tỉnh/thành, or the AU state. */
  region: string;
  /** Quận/huyện or phường/xã; in HCMC one of DISTRICTS (drivers are dispatched by it); in AU the suburb. */
  district: string;
  /** AU only. */
  postcode: string | null;
  address: string;
  company: string | null;
};

/** Why a destination is invalid, or null. The API and the forms share it. */
export function destinationError(d: Destination): string | null {
  if (!d.address.trim()) return "Nhập địa chỉ";
  if (d.country === "VN") {
    if (!(VN_PROVINCES as readonly string[]).includes(d.region)) return "Chọn tỉnh/thành";
    if (d.region === HCMC) return (DISTRICTS as readonly string[]).includes(d.district) ? null : "Chọn quận/huyện";
    return d.district.trim() ? null : "Nhập quận/huyện, phường/xã";
  }
  if (!(AU_STATES as readonly string[]).includes(d.region)) return "Chọn bang (state)";
  if (!d.district.trim()) return "Nhập suburb";
  return /^\d{4}$/.test(d.postcode ?? "") ? null : "Postcode gồm 4 số";
}

type Place = { country: string; region: string; district: string; postcode?: string | null; address: string; company?: string | null };

/** One line for labels and maps: "12 Trần Hưng Đạo, Quận 5, TP. Hồ Chí Minh" or "KHOUSE PTY LTD, 7 Glassop St, Yagoona NSW 2199, Australia". */
export function formatDestination(d: Place): string {
  const company = d.company ? `${d.company}, ` : "";
  if (d.country === "AU") return `${company}${d.address}, ${d.district} ${d.region} ${d.postcode ?? ""}, Australia`.replace(" ,", ",");
  return `${company}${d.address}, ${d.district}, ${d.region}`;
}

/** What the admin groups deliveries by: the HCMC district, else the province, else the AU state. */
export function deliveryArea(d: Pick<Place, "country" | "region" | "district">): string {
  if (d.country === "AU") return `${d.region}, Australia`;
  return d.region === HCMC ? d.district : d.region;
}

/** Phones are stored in local form ("0414578383"); +61 / +84 prefixes are folded in. Calling an AU number from VN needs +61. */
export function dialable(phone: string, country: string): string {
  return country === "AU" && phone.startsWith("0") ? `+61${phone.slice(1)}` : phone;
}
