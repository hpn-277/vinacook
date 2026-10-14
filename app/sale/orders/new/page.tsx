import { ActionForm } from "@/components/ActionForm";
import { Button, Card, Field, inputClass, PageTitle } from "@/components/ui";
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
        <input name="phone" type="tel" defaultValue={phone} placeholder="SĐT khách" required className={inputClass} />
        <Button type="submit" tone="secondary">
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
        <ActionForm action={placeStaffOrder} className="space-y-3" key={phone}>
          <Field label="Số điện thoại">
            <input name="phone" type="tel" required defaultValue={phone} className={inputClass} />
          </Field>
          <Field label="Họ tên">
            <input name="name" required defaultValue={found?.name ?? ""} className={inputClass} />
          </Field>
          <Field label="Địa chỉ">
            <input name="address" required defaultValue={found?.default_address ?? ""} className={inputClass} />
          </Field>
          <Field label="Quận/Huyện">
            <select name="district" required defaultValue={found?.default_district ?? ""} className={inputClass}>
              <option value="" disabled>
                Chọn quận/huyện
              </option>
              {DISTRICTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-700">Sản phẩm (kg)</legend>
            {products.map((p) => (
              <label key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {p.name} <span className="text-gray-500">({formatVnd(p.price_per_kg)}/kg)</span>
                </span>
                <input
                  name={`qty_${p.id}`}
                  aria-label={`Số kg ${p.name}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  placeholder="0"
                  className="w-24 rounded-lg border border-gray-300 px-2 py-2 text-right text-base"
                />
              </label>
            ))}
          </fieldset>
          <Field label="Ghi chú">
            <textarea name="note" rows={2} className={inputClass} />
          </Field>
          <Button type="submit" className="w-full">
            Tạo đơn
          </Button>
        </ActionForm>
      </Card>
    </>
  );
}
