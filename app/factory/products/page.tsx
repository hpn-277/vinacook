import { PageTitle } from "@/components/page-title";
import { ProductStatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatVnd } from "@/lib/domain/money";
import { ProductDialog } from "./ProductDialog";

export default async function FactoryProductsPage() {
  const me = await requireRole("factory");
  const products = unwrap(
    await db()
      .from("products")
      .select("id, name, price_per_kg, description, image_url, status, reject_reason, active")
      .eq("factory_id", me.factory_id!)
      .order("id", { ascending: false }),
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&_h1]:mb-0">
        <PageTitle>Sản phẩm của xưởng</PageTitle>
        <ProductDialog />
      </div>
      <Card size="sm">
        <CardContent>
          {products.length === 0 ? (
            <p className="text-muted-foreground">Xưởng chưa có sản phẩm. Bấm “Thêm sản phẩm” để gửi quản lý duyệt.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">Giá sỉ/kg</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id} data-factory-product={p.name}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted font-semibold text-muted-foreground">
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium">{p.name}</div>
                          {p.description && <div className="max-w-80 truncate text-xs text-muted-foreground">{p.description}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatVnd(p.price_per_kg)}</TableCell>
                    <TableCell className="whitespace-normal">
                      <ProductStatusBadge status={p.status} />
                      {p.status === "approved" && !p.active && <div className="mt-1 text-xs text-muted-foreground">Tạm ngừng bán</div>}
                      {p.status === "rejected" && p.reject_reason && <div className="mt-1 max-w-60 text-xs text-destructive">Lý do: {p.reject_reason}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status === "approved" ? (
                        <span className="text-xs text-muted-foreground">Quản lý sửa</span>
                      ) : (
                        <ProductDialog product={p} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
