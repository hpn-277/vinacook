import { PageTitle } from "@/components/page-title";
import { StaffOrderForm } from "@/components/StaffOrderForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { DISTRICTS } from "@/lib/domain/districts";
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
      <StaffOrderForm action={placeStaffOrder} catalog={catalog} terms={terms} key={phone}>
        <Card>
          <CardContent>
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
            </FieldGroup>
          </CardContent>
        </Card>
      </StaffOrderForm>
    </>
  );
}
