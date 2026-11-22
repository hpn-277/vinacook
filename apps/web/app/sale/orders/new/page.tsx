import { PageTitle } from "@/components/page-title";
import { StaffOrderForm } from "./StaffOrderForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth";
import { DestinationFields } from "@/components/DestinationFields";
import { customerLookup, normalizePhone, orderForm } from "@noodle/core/queries/sale";

export default async function NewStaffOrderPage({ searchParams }: PageProps<"/sale/orders/new">) {
  const me = await requireRole("sale", "admin");
  const phone = normalizePhone((await searchParams).phone);
  const [{ catalog }, lookup] = await Promise.all([orderForm(), customerLookup(phone, me.id)]);
  const found = lookup?.found ?? null;
  const ownedByOther = lookup?.ownedByOther ?? false;

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
              Khách thuộc {lookup?.ownerName}; đơn vẫn được lưu nhưng tính cho nhân viên đó.
            </span>
          )}
        </p>
      )}
      <StaffOrderForm catalog={catalog} key={phone}>
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
              <DestinationFields id="order" value={found?.destination} />
            </FieldGroup>
          </CardContent>
        </Card>
      </StaffOrderForm>
    </>
  );
}
