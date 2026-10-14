import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { DISTRICTS } from "@/lib/domain/districts";
import { formatVnd } from "@/lib/domain/money";
import { placeStaffOrder } from "./actions";

export default async function NewStaffOrderPage({ searchParams }: PageProps<"/sale/orders/new">) {
  const me = await requireRole("sale", "manager");
  const raw = (await searchParams).phone;
  const phone = typeof raw === "string" ? raw.replace(/[\s.-]/g, "") : "";
  const [products, customer] = await Promise.all([
    db().from("products").select("id, name, price_per_kg").eq("active", true).order("id").then(unwrap),
    phone
      ? db().from("customers").select("name, phone, default_address, default_district, sale_id, staff(name)").eq("phone", phone).maybeSingle()
      : null,
  ]);
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
              <FieldSet className="gap-2">
                <FieldLegend variant="label">Sản phẩm (kg)</FieldLegend>
                {products.map((p) => (
                  <label key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {p.name} <span className="text-muted-foreground">({formatVnd(p.price_per_kg)}/kg)</span>
                    </span>
                    <Input
                      name={`qty_${p.id}`}
                      aria-label={`Số kg ${p.name}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      placeholder="0"
                      className="w-24 text-right"
                    />
                  </label>
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
