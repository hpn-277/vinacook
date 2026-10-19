import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductStatusBadge } from "@/components/status-badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { packGroupLabels, packSize } from "@/lib/domain/catalog";
import { formatVnd } from "@/lib/domain/money";
import { retailPerKg } from "@/lib/domain/pricing";
import type { ProductStatus } from "@/lib/domain/status";
import { getSettings } from "@/lib/orders";
import { approveProduct, savePricing } from "./actions";
import { ProductDialog } from "./ProductDialog";
import { RejectDialog } from "./RejectDialog";

const BUCKETS = ["pending", "selling", "stopped", "rejected"] as const;
type Bucket = (typeof BUCKETS)[number];
const BUCKET_LABEL: Record<Bucket, string> = {
  pending: "Chờ duyệt",
  selling: "Đang bán",
  stopped: "Ngừng bán",
  rejected: "Không duyệt",
};
const bucketOf = (p: { status: ProductStatus; active: boolean }): Bucket => (p.status === "approved" ? (p.active ? "selling" : "stopped") : p.status);

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireRole("manager");
  const sp = await searchParams;
  const bucket = BUCKETS.find((b) => b === sp.status);
  const [settings, products, packs, factories] = await Promise.all([
    getSettings(),
    db().from("products").select("*, factories(name)").order("id").then(unwrap),
    db().from("product_packs").select("id, product_id, name, kg_per_unit, image_url, active").order("kg_per_unit").order("name").then(unwrap),
    db().from("factories").select("id, name, active").order("id").then(unwrap),
  ]);

  const packsByProduct = Map.groupBy(packs, (pk) => pk.product_id);
  const rows = products
    .map((p) => ({
      product: p,
      bucket: bucketOf(p),
      packs: packsByProduct.get(p.id) ?? [],
    }))
    .sort((a, b) => Number(b.bucket === "pending") - Number(a.bucket === "pending") || a.product.id - b.product.id);
  const factory = factories.find((f) => String(f.id) === sp.factory);
  const ofFactory = factory ? rows.filter((r) => r.product.factory_id === factory.id) : rows;
  const shown = bucket ? ofFactory.filter((r) => r.bucket === bucket) : ofFactory;
  const productsOf = Map.groupBy(products, (p) => p.factory_id);
  const filterHref = (status?: Bucket) => {
    const q = new URLSearchParams({
      ...(factory && { factory: String(factory.id) }),
      ...(status && { status }),
    }).toString();
    return `/admin/products${q ? `?${q}` : ""}#san-pham`;
  };

  return (
    <div className="space-y-6">
      <PageTitle>Sản phẩm</PageTitle>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="font-semibold">
            <h2>Giá sỉ / giá lẻ</h2>
          </CardTitle>
          <CardDescription>
            Giá lẻ = Giá sỉ × (1 + % chênh lệch), làm tròn 100đ. Đơn được giá sỉ (cả đơn) khi đủ số kg tối thiểu hoặc tổng tiền theo giá lẻ đủ mức tối thiểu.
            Thay đổi chỉ áp dụng cho đơn mới.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={savePricing} className="grid gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] sm:items-end">
            <Field>
              <FieldLabel htmlFor="retail_markup_pct">% chênh lệch giá lẻ</FieldLabel>
              <Input id="retail_markup_pct" name="retail_markup_pct" type="number" step="0.01" min={0} defaultValue={settings.retail_markup_pct} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="wholesale_min_kg">Giá sỉ từ (kg)</FieldLabel>
              <Input id="wholesale_min_kg" name="wholesale_min_kg" type="number" step="0.01" min={0} defaultValue={settings.wholesale_min_kg} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="wholesale_min_total">hoặc từ (đ, tính theo giá lẻ)</FieldLabel>
              <Input
                id="wholesale_min_total"
                name="wholesale_min_total"
                type="number"
                step={1000}
                min={0}
                defaultValue={settings.wholesale_min_total}
                required
              />
            </Field>
            <Button>Lưu</Button>
          </ActionForm>
        </CardContent>
      </Card>

      <Card size="sm" id="san-pham">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="font-semibold">
              <h2>Sản phẩm ({shown.length})</h2>
            </CardTitle>
            <CardDescription>Sản phẩm của mọi xưởng. Chỉ sản phẩm đã duyệt và đang bán mới hiện cho khách.</CardDescription>
          </div>
          <ProductDialog factories={factories} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <AutoSubmitForm action="/admin/products">
              {bucket && <input type="hidden" name="status" value={bucket} />}
              <NativeSelect name="factory" defaultValue={factory?.id ?? ""} aria-label="Lọc theo xưởng" size="sm">
                <NativeSelectOption value="">Tất cả xưởng ({rows.length})</NativeSelectOption>
                {factories
                  .filter((f) => productsOf.has(f.id))
                  .sort((x, y) => x.name.localeCompare(y.name, "vi"))
                  .map((f) => (
                    <NativeSelectOption key={f.id} value={f.id}>
                      {f.name} ({productsOf.get(f.id)!.length})
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
            </AutoSubmitForm>
            <nav aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
              {[undefined, ...BUCKETS].map((b) => {
                const count = b ? ofFactory.filter((r) => r.bucket === b).length : ofFactory.length;
                if (b && !count) return null;
                return (
                  <Badge key={b ?? "all"} asChild variant={b === bucket ? "default" : "outline"} className="h-7 px-2.5 text-sm">
                    <Link href={filterHref(b)} aria-current={b === bucket ? "page" : undefined}>
                      {b ? BUCKET_LABEL[b] : "Tất cả"} ({count})
                    </Link>
                  </Badge>
                );
              })}
            </nav>
          </div>
          {shown.length === 0 && <p className="text-sm text-muted-foreground">Không có sản phẩm phù hợp.</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="text-right">Giá sỉ / lẻ (kg)</TableHead>
                <TableHead>Quy cách</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map(({ product: p, bucket: b, packs: own }) => (
                <TableRow key={p.id} data-product-row={p.name}>
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
                        <div className="text-xs text-muted-foreground">{p.factories?.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">
                    {formatVnd(p.price_per_kg)}
                    <div className="text-xs text-muted-foreground">{formatVnd(retailPerKg(p.price_per_kg, settings.retail_markup_pct))}</div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex max-w-64 flex-wrap gap-1">
                      {packGroupLabels(own.filter((pk) => pk.active)).map((label) => (
                        <Badge key={label} variant="outline" className="font-normal text-muted-foreground">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <ProductStatusBadge status={p.status} />
                    {b === "stopped" && <div className="mt-1 text-xs text-muted-foreground">Ngừng bán</div>}
                    {b === "rejected" && p.reject_reason && <div className="mt-1 max-w-48 text-xs text-destructive">Lý do: {p.reject_reason}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      {b === "pending" && (
                        <>
                          <ActionForm action={approveProduct}>
                            <input type="hidden" name="id" value={p.id} />
                            <Button size="sm" aria-label={`Duyệt ${p.name}`}>
                              Duyệt
                            </Button>
                          </ActionForm>
                          <RejectDialog
                            product={{
                              id: p.id,
                              name: p.name,
                              factory: p.factories?.name ?? "Xưởng",
                            }}
                          />
                        </>
                      )}
                      <ProductDialog
                        factories={factories}
                        product={{
                          ...p,
                          packs: own.map((pk) => ({
                            id: pk.id,
                            label: packSize(pk),
                            image_url: pk.image_url,
                            active: pk.active,
                          })),
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
