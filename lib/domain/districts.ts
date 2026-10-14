export const DISTRICTS = [
  "Quận 1",
  "Quận 3",
  "Quận 4",
  "Quận 5",
  "Quận 6",
  "Quận 7",
  "Quận 8",
  "Quận 10",
  "Quận 11",
  "Quận 12",
  "Bình Thạnh",
  "Gò Vấp",
  "Phú Nhuận",
  "Tân Bình",
  "Tân Phú",
  "Bình Tân",
  "Thủ Đức",
  "Hóc Môn",
  "Củ Chi",
  "Bình Chánh",
  "Nhà Bè",
  "Cần Giờ",
] as const;
export type District = (typeof DISTRICTS)[number];

export function isDistrict(value: string): value is District {
  return (DISTRICTS as readonly string[]).includes(value);
}
