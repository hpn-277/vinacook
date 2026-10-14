import { PublicShell } from "@/components/PublicShell";
import { PageTitle } from "@/components/page-title";
import { unwrap } from "@/lib/action";
import { db } from "@/lib/db";
import { placeCustomerOrder } from "./actions";
import { CheckoutForm } from "./CheckoutForm";

export default async function CheckoutPage() {
  const products = unwrap(await db().from("products").select("id, name, price_per_kg").eq("active", true).order("id"));
  return (
    <PublicShell>
      <PageTitle>Đặt hàng</PageTitle>
      <CheckoutForm products={products} action={placeCustomerOrder} />
    </PublicShell>
  );
}
