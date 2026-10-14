import { ActionForm } from "@/components/ActionForm";
import { Button, Card, inputClass, PageTitle } from "@/components/ui";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/orders";
import { createStaff, saveCutoff, saveFactory, saveProduct, updateStaff } from "./actions";

const ROLE_LABEL = { manager: "Quản lý", sale: "NVKD", factory: "Xưởng", driver: "Tài xế" } as const;
const small = "rounded border border-gray-300 px-2 py-1";

export default async function SettingsPage() {
  await requireRole("manager");
  const [settings, products, factories, staff] = await Promise.all([
    getSettings(),
    db().from("products").select("*").order("id").then(unwrap),
    db().from("factories").select("*").order("id").then(unwrap),
    db().from("staff").select("*, factories(name)").order("role").order("id").then(unwrap),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle>Cài đặt</PageTitle>

      <Card>
        <h2 className="mb-2 font-semibold">Giờ chốt đơn ({settings.timezone})</h2>
        <ActionForm action={saveCutoff} className="flex gap-2">
          <input type="time" name="cutoff_time" defaultValue={settings.cutoff_time.slice(0, 5)} className={`${inputClass} w-auto`} />
          <Button>Lưu</Button>
        </ActionForm>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Sản phẩm</h2>
        <div className="space-y-2">
          {[...products, null].map((p) => (
            <ActionForm key={p?.id ?? "new"} action={saveProduct} className="flex flex-wrap items-center gap-2 text-sm">
              <input type="hidden" name="id" value={p?.id ?? ""} />
              <input name="name" defaultValue={p?.name} placeholder="Tên sản phẩm mới" required className={small} />
              <input name="price_per_kg" type="number" defaultValue={p?.price_per_kg} placeholder="Giá/kg" required className={`${small} w-28`} />
              <input name="image_url" defaultValue={p?.image_url ?? ""} placeholder="Link ảnh" className={`${small} w-40`} />
              <label className="flex items-center gap-1">
                <input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> Đang bán
              </label>
              <Button tone="secondary">{p ? "Lưu" : "Thêm"}</Button>
            </ActionForm>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Xưởng</h2>
        <div className="space-y-2">
          {[...factories, null].map((f) => (
            <ActionForm key={f?.id ?? "new"} action={saveFactory} className="flex flex-wrap items-center gap-2 text-sm">
              <input type="hidden" name="id" value={f?.id ?? ""} />
              <input name="name" defaultValue={f?.name} placeholder="Tên xưởng mới" required className={small} />
              <input name="address" defaultValue={f?.address ?? ""} placeholder="Địa chỉ" className={small} />
              <input name="phone" defaultValue={f?.phone ?? ""} placeholder="SĐT" className={`${small} w-28`} />
              <input name="capacity_kg_per_day" type="number" defaultValue={f?.capacity_kg_per_day} placeholder="Công suất kg/ngày" required className={`${small} w-28`} />
              <label className="flex items-center gap-1">
                <input type="checkbox" name="active" defaultChecked={f?.active ?? true} /> Hoạt động
              </label>
              <Button tone="secondary">{f ? "Lưu" : "Thêm"}</Button>
            </ActionForm>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Nhân viên</h2>
        <div className="space-y-2">
          {staff.map((s) => (
            <ActionForm key={s.id} action={updateStaff} className="flex flex-wrap items-center gap-2 text-sm">
              <input type="hidden" name="id" value={s.id} />
              <span className="w-16 text-gray-500">{ROLE_LABEL[s.role]}</span>
              <input name="name" defaultValue={s.name} className={small} />
              {s.role === "sale" && (
                <>
                  <span className="font-mono">{s.ref_code}</span>
                  <input name="commission_pct" type="number" step="0.1" defaultValue={s.commission_pct ?? 0} className={`${small} w-20`} />%
                </>
              )}
              {s.factories && <span className="text-gray-500">{s.factories.name}</span>}
              <label className="flex items-center gap-1">
                <input type="checkbox" name="active" defaultChecked={s.active} /> Hoạt động
              </label>
              <Button tone="secondary">Lưu</Button>
            </ActionForm>
          ))}
        </div>
        <h3 className="mb-2 mt-4 font-medium">Thêm nhân viên</h3>
        <ActionForm action={createStaff} className="grid gap-2 text-sm sm:grid-cols-2">
          <input name="email" placeholder="Email đăng nhập" required className={small} />
          <input name="password" type="password" placeholder="Mật khẩu" required className={small} />
          <select name="role" className={small}>
            {Object.entries(ROLE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input name="name" placeholder="Tên" required className={small} />
          <input name="phone" placeholder="SĐT" className={small} />
          <input name="ref_code" placeholder="Mã giới thiệu (NVKD)" className={small} />
          <input name="commission_pct" type="number" step="0.1" placeholder="% hoa hồng (NVKD)" className={small} />
          <select name="factory_id" className={small} defaultValue="">
            <option value="">Xưởng (tài khoản xưởng)</option>
            {factories.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <Button>Tạo</Button>
        </ActionForm>
      </Card>
    </div>
  );
}
