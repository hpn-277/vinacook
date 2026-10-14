import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/orders";
import { createStaff, saveCutoff, saveFactory, saveProduct, updateStaff } from "./actions";

const ROLE_LABEL = { manager: "Quản lý", sale: "NVKD", factory: "Xưởng", driver: "Tài xế" } as const;

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

      <Card size="sm">
        <CardHeader>
          <CardTitle className="font-semibold">
            <h2>Giờ chốt đơn ({settings.timezone})</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={saveCutoff} className="flex flex-wrap gap-2">
            <Input type="time" name="cutoff_time" defaultValue={settings.cutoff_time.slice(0, 5)} className="w-auto" />
            <Button>Lưu</Button>
          </ActionForm>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="font-semibold">
            <h2>Sản phẩm</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Giá/kg</TableHead>
                <TableHead>Ảnh</TableHead>
                <TableHead>Đang bán</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...products, null].map((p) => {
                const form = `product-${p?.id ?? "new"}`;
                return (
                  <TableRow key={form} className="align-top">
                    <TableCell>
                      <Input form={form} name="name" defaultValue={p?.name} placeholder="Tên sản phẩm mới" required className="min-w-40" />
                    </TableCell>
                    <TableCell>
                      <Input form={form} name="price_per_kg" type="number" defaultValue={p?.price_per_kg} placeholder="Giá/kg" required className="w-28" />
                    </TableCell>
                    <TableCell>
                      <Input form={form} name="image_url" defaultValue={p?.image_url ?? ""} placeholder="Link ảnh" className="min-w-40" />
                    </TableCell>
                    <TableCell className="align-middle">
                      <Checkbox form={form} name="active" defaultChecked={p?.active ?? true} aria-label="Đang bán" />
                    </TableCell>
                    <TableCell>
                      <ActionForm id={form} action={saveProduct}>
                        <input type="hidden" name="id" value={p?.id ?? ""} />
                        <Button variant={p ? "outline" : "default"}>{p ? "Lưu" : "Thêm"}</Button>
                      </ActionForm>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="font-semibold">
            <h2>Xưởng</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Địa chỉ</TableHead>
                <TableHead>SĐT</TableHead>
                <TableHead>Công suất kg/ngày</TableHead>
                <TableHead>Hoạt động</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...factories, null].map((f) => {
                const form = `factory-${f?.id ?? "new"}`;
                return (
                  <TableRow key={form} className="align-top">
                    <TableCell>
                      <Input form={form} name="name" defaultValue={f?.name} placeholder="Tên xưởng mới" required className="min-w-36" />
                    </TableCell>
                    <TableCell>
                      <Input form={form} name="address" defaultValue={f?.address ?? ""} placeholder="Địa chỉ" className="min-w-40" />
                    </TableCell>
                    <TableCell>
                      <Input form={form} name="phone" defaultValue={f?.phone ?? ""} placeholder="SĐT" className="w-32" />
                    </TableCell>
                    <TableCell>
                      <Input
                        form={form}
                        name="capacity_kg_per_day"
                        type="number"
                        defaultValue={f?.capacity_kg_per_day}
                        placeholder="Công suất kg/ngày"
                        required
                        className="w-40"
                      />
                    </TableCell>
                    <TableCell className="align-middle">
                      <Checkbox form={form} name="active" defaultChecked={f?.active ?? true} aria-label="Hoạt động" />
                    </TableCell>
                    <TableCell>
                      <ActionForm id={form} action={saveFactory}>
                        <input type="hidden" name="id" value={f?.id ?? ""} />
                        <Button variant={f ? "outline" : "default"}>{f ? "Lưu" : "Thêm"}</Button>
                      </ActionForm>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="font-semibold">
            <h2>Nhân viên</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vai trò</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>% hoa hồng</TableHead>
                <TableHead>Xưởng</TableHead>
                <TableHead>Hoạt động</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => {
                const form = `staff-${s.id}`;
                return (
                  <TableRow key={s.id} className="align-top">
                    <TableCell className="align-middle text-muted-foreground">{ROLE_LABEL[s.role]}</TableCell>
                    <TableCell>
                      <Input form={form} name="name" defaultValue={s.name} className="min-w-36" />
                    </TableCell>
                    <TableCell className="align-middle font-mono">{s.ref_code}</TableCell>
                    <TableCell>
                      {s.role === "sale" && (
                        <Input form={form} name="commission_pct" type="number" step="0.1" defaultValue={s.commission_pct ?? 0} className="w-20" />
                      )}
                    </TableCell>
                    <TableCell className="align-middle text-muted-foreground">{s.factories?.name}</TableCell>
                    <TableCell className="align-middle">
                      <Checkbox form={form} name="active" defaultChecked={s.active} aria-label="Hoạt động" />
                    </TableCell>
                    <TableCell>
                      <ActionForm id={form} action={updateStaff}>
                        <input type="hidden" name="id" value={s.id} />
                        <Button variant="outline">Lưu</Button>
                      </ActionForm>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Separator />
          <h3 className="font-medium">Thêm nhân viên</h3>
          <ActionForm action={createStaff} className="grid gap-2 sm:grid-cols-2">
            <Input name="email" placeholder="Email đăng nhập" required />
            <Input name="password" type="password" placeholder="Mật khẩu" required />
            <NativeSelect name="role" className="w-full">
              {Object.entries(ROLE_LABEL).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Input name="name" placeholder="Tên" required />
            <Input name="phone" placeholder="SĐT" />
            <Input name="ref_code" placeholder="Mã giới thiệu (NVKD)" />
            <Input name="commission_pct" type="number" step="0.1" placeholder="% hoa hồng (NVKD)" />
            <NativeSelect name="factory_id" defaultValue="" className="w-full">
              <NativeSelectOption value="">Xưởng (tài khoản xưởng)</NativeSelectOption>
              {factories.map((f) => (
                <NativeSelectOption key={f.id} value={f.id}>
                  {f.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button className="sm:col-span-2">Tạo</Button>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
