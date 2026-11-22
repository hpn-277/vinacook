import { itemLabel } from "./domain/catalog";
import type { Country, Destination } from "./domain/destination";

/** What the "Đặt lại" button needs: the customer, and each line with whether its pack is still on sale. */
export type ReorderSource = {
  code: string;
  productionDate: string;
  contact: { name: string; phone: string; destination: Destination };
  lines: { packId: number; packQty: number; label: string; available: boolean }[];
};

export const REORDER_FIELDS =
  "code, production_date, phone, country, region, district, postcode, address, company, customers(name), order_items(pack_id, pack_name, pack_qty, qty_kg, products(name, active), product_packs(active))";

type ReorderRow = {
  code: string;
  production_date: string;
  phone: string;
  country: string;
  region: string;
  district: string;
  postcode: string | null;
  address: string;
  company: string | null;
  customers: { name: string } | null;
  order_items: {
    pack_id: number;
    pack_name: string;
    pack_qty: number;
    qty_kg: number;
    products: { name: string; active: boolean } | null;
    product_packs: { active: boolean } | null;
  }[];
};

export function toReorderSource(o: ReorderRow): ReorderSource {
  return {
    code: o.code,
    productionDate: o.production_date,
    contact: {
      name: o.customers?.name ?? "",
      phone: o.phone,
      destination: {
        country: o.country as Country,
        region: o.region,
        district: o.district,
        postcode: o.postcode,
        address: o.address,
        company: o.company,
      },
    },
    lines: o.order_items.map((i) => ({
      packId: i.pack_id,
      packQty: i.pack_qty,
      label: itemLabel(i),
      available: Boolean(i.products?.active && i.product_packs?.active),
    })),
  };
}
