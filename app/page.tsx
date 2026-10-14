import { PublicShell } from "@/components/PublicShell";
import { Shop } from "@/components/Shop";
import { PageTitle } from "@/components/ui";
import { unwrap } from "@/lib/action";
import { db } from "@/lib/db";

export default async function HomePage() {
  const products = unwrap(
    await db().from("products").select("id, name, price_per_kg, image_url").eq("active", true).order("id"),
  );
  return (
    <PublicShell>
      <PageTitle>Mì, bún, phở tươi mỗi ngày</PageTitle>
      <p className="mb-4 text-sm text-gray-600">Nhập số kg cần đặt. Đặt trước 17:00 giao trong ngày sản xuất hôm nay.</p>
      <Shop products={products} />
    </PublicShell>
  );
}
