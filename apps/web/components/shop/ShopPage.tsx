import { PublicShell } from "@/components/shop/PublicShell";
import { LastOrderCard } from "@/components/shop/Reorder";
import { Shop } from "@/components/shop/Shop";
import { PageTitle } from "@/components/page-title";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getSettings, loadCatalog } from "@noodle/core/orders";

export async function ShopPage({ referrer }: { referrer?: { name: string; code: string } | null }) {
  const [catalog, settings] = await Promise.all([loadCatalog(), getSettings()]);
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
        Chọn sản phẩm để xem quy cách và đặt hàng. Đặt trước {settings.cutoff_time.slice(0, 5)} giao trong ngày sản
        xuất hôm nay.
      </p>
      <LastOrderCard />
      <Shop catalog={catalog} />
    </PublicShell>
  );
}
