import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/page-title";
import { wholesaleRule } from "@/components/PricingSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { packSize } from "@/lib/domain/catalog";
import { DISTRICTS } from "@/lib/domain/districts";
import { formatVnd } from "@/lib/domain/money";
import { retailPerKg } from "@/lib/domain/pricing";
import { getSettings, loadCatalog, pricingTerms } from "@/lib/orders";
import { placeStaffOrder } from "./actions";

export default async function NewStaffOrderPage({ searchParams }: PageProps<"/sale/orders/new">) {
  const me = await requireRole("sale", "manager");
  const raw = (await searchParams).phone;
  const phone = typeof raw === "string" ? raw.replace(/[\s.-]/g, "") : "";
  const [catalog, settings, customer] = await Promise.all([
    loadCatalog(),
    getSettings(),
    phone
      ? db().from("customers").select("name, phone, default_address, default_district, sale_id, staff(name)").eq("phone", phone).maybeSingle()
      : null,
  ]);
  const terms = pricingTerms(settings);
  const found = customer?.data ?? null;
  const ownedByOther = found?.sale_id != null && found.sale_id !== me.id;

  return (
    <>
      <PageTitle>Tạo đơn cho khách</PageTitle>
      <form className="mb-4 flex gap-2">
        <Input name="phone" type="tel" defaultValue={phone} placeholder="SĐT khách" required />
        <Button type="submit" variant="outline">
          Tìm khách
        </Button>
      </form>
      {phone && (
        <p className="mb-3 text-sm" role="note">
          {found ? `Khách cũ: ${found.name}` : "Khách mới, nhập thông tin bên dưới."}
          {ownedByOther && (
            <span className="ml-1 font-medium text-amber-700">
              Khách thuộc {found?.staff?.name}; đơn vẫn được lưu nhưng tính cho nhân viên đó.
            </span>
          )}
        </p>
      )}
      <Card>
        <CardContent>
          <ActionForm action={placeStaffOrder} key={phone}>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor="order-phone">Số điện thoại</FieldLabel>
                <Input id="order-phone" name="phone" type="tel" required defaultValue={phone} />
              </Field>
              <Field>
                <FieldLabel htmlFor="order-name">Họ tên</FieldLabel>
                <Input id="order-name" name="name" required defaultValue={found?.name ?? ""} />
              </Field>
              <Field>
                <FieldLabel htmlFor="order-address">Địa chỉ</FieldLabel>
                <Input id="order-address" name="address" required defaultValue={found?.default_address ?? ""} />
              </Field>
              <Field>
                <FieldLabel htmlFor="order-district">Quận/Huyện</FieldLabel>
                <NativeSelect id="order-district" name="district" required defaultValue={found?.default_district ?? ""} className="w-full">
                  <NativeSelectOption value="" disabled>
                    Chọn quận/huyện
                  </NativeSelectOption>
                  {DISTRICTS.map((d) => (
                    <NativeSelectOption key={d}>{d}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <FieldSet className="gap-3">
                <FieldLegend variant="label">Sản phẩm (số lượng theo quy cách)</FieldLegend>
                <FieldDescription>{wholesaleRule(terms)}, áp dụng cho cả đơn; giá được tính khi lưu.</FieldDescription>
                {catalog.map((p) => (
                  <div key={p.id} className="rounded-lg border p-2.5">
                    <div className="mb-2 text-sm">
                      <b>{p.name}</b>{" "}
                      <span className="text-muted-foreground">
                        Sỉ {formatVnd(p.price_per_kg)}/kg · Lẻ {formatVnd(retailPerKg(p.price_per_kg, terms.retailMarkupPct))}/kg
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {p.packs.map((pack) => (
                        <label key={pack.id} className="text-xs text-muted-foreground">
                          {packSize(pack)}
                          <Input
                            name={`qty_${pack.id}`}
                            aria-label={`Số lượng ${p.name} - ${pack.name}`}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            placeholder="0"
                            className="mt-1 text-right"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </FieldSet>
              <Field>
                <FieldLabel htmlFor="order-note">Ghi chú</FieldLabel>
                <Textarea id="order-note" name="note" rows={2} />
              </Field>
              <Button type="submit" size="lg" className="w-full">
                Tạo đơn
              </Button>
            </FieldGroup>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
