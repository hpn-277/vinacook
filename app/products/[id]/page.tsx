import { notFound } from "next/navigation";
import { ProductView } from "./ProductView";
import { PublicShell } from "@/components/shop/PublicShell";
import { getSettings, loadCatalog, pricingTerms } from "@/lib/orders";

export default async function ProductPage({ params }: PageProps<"/products/[id]">) {
  const id = Number((await params).id);
  const [catalog, settings] = await Promise.all([loadCatalog(), getSettings()]);
  const product = catalog.find((p) => p.id === id);
  if (!product) notFound();
  return (
    <PublicShell>
      <ProductView product={product} catalog={catalog} terms={pricingTerms(settings)} />
    </PublicShell>
  );
}
