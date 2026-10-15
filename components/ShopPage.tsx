import { PublicShell } from "@/components/PublicShell";
import { wholesaleRule } from "@/components/PricingSummary";
import { LastOrderCard } from "@/components/Reorder";
import { Shop } from "@/components/Shop";
import { PageTitle } from "@/components/page-title";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSettings, loadCatalog, pricingTerms } from "@/lib/orders";

export async function ShopPage({ referrer }: { referrer?: { name: string; code: string } | null }) {
  const [catalog, settings] = await Promise.all([loadCatalog(), getSettings()]);
  const terms = pricingTerms(settings);
  return (
    <PublicShell>
      <PageTitle>Mì, bún, phở tươi mỗi ngày</PageTitle>
      {referrer && (
        <Alert className="mb-4" data-testid="referrer">
          <AlertDescription>
            Bạn đang đặt hàng qua nhân viên kinh doanh <b className="text-foreground">{referrer.name}</b> ({referrer.code}).
          </AlertDescription>
        </Alert>
      )}
      <p className="mb-4 text-sm text-muted-foreground">
        Chọn quy cách và số lượng. {wholesaleRule(terms)}, áp dụng cho cả đơn. Đặt trước {settings.cutoff_time.slice(0, 5)} giao trong ngày sản
        xuất hôm nay.
      </p>
      <LastOrderCard />
      <Shop catalog={catalog} terms={terms} />
    </PublicShell>
  );
}
