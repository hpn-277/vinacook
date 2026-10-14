import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { REORDER_FIELDS, toReorderSource } from "@/lib/reorder";

/** The newest order for a phone the browser remembered; same exposure as the /orders lookup. */
export async function GET(req: NextRequest) {
  const phone = (req.nextUrl.searchParams.get("phone") ?? "").replace(/[\s.-]/g, "");
  if (!/^0\d{9,10}$/.test(phone)) return NextResponse.json(null);
  const { data, error } = await db()
    .from("orders")
    .select(REORDER_FIELDS)
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .order("id", { referencedTable: "order_items" })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return NextResponse.json(data ? toReorderSource(data) : null, { headers: { "Cache-Control": "no-store" } });
}
