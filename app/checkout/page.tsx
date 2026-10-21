import { PublicShell } from "@/components/shop/PublicShell";
import { PageTitle } from "@/components/page-title";
import { getSettings, loadCatalog, pricingTerms } from "@/lib/orders";
import { placeCustomerOrder } from "./actions";
import { CheckoutForm } from "./CheckoutForm";

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const sp = await searchParams;
  const [catalog, settings] = await Promise.all([loadCatalog(), getSettings()]);
  const reorder = typeof sp.from === "string" ? { code: sp.from, skipped: typeof sp.skipped === "string" ? sp.skipped.split("; ") : [] } : null;
  return (
    <PublicShell>
      <PageTitle>Đặt hàng</PageTitle>
      <CheckoutForm catalog={catalog} terms={pricingTerms(settings)} reorder={reorder} action={placeCustomerOrder} />
    </PublicShell>
  );
}
