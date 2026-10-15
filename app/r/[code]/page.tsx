import { ShopPage } from "@/components/ShopPage";
import { db } from "@/lib/db";

export default async function ReferralShopPage({ params }: PageProps<"/r/[code]">) {
  const code = (await params).code.toUpperCase();
  const { data: sale } = await db().from("staff").select("name, ref_code").eq("ref_code", code).eq("role", "sale").eq("active", true).maybeSingle();
  return <ShopPage referrer={sale ? { name: sale.name, code } : null} />;
}
