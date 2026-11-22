import { notFound } from "next/navigation";
import { ProductView } from "./ProductView";
import { PublicShell } from "@/components/shop/PublicShell";
import { loadCatalog } from "@noodle/core/orders";

export default async function ProductPage({ params }: PageProps<"/products/[id]">) {
  const id = Number((await params).id);
  const catalog = await loadCatalog();
  const product = catalog.find((p) => p.id === id);
  if (!product) notFound();
  return (
    <PublicShell>
      <ProductView product={product} catalog={catalog} />
    </PublicShell>
  );
}
