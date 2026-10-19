import { ActionForm } from "@/components/ActionForm";
import { ImageFileInput } from "@/components/ImageFileInput";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { unwrap } from "@/lib/action";
import { requireRole, ROLE_LABEL } from "@/lib/auth";
import { db } from "@/lib/db";
import { packSize } from "@/lib/domain/catalog";
import { formatVnd } from "@/lib/domain/money";
import { packPrice, retailPerKg } from "@/lib/domain/pricing";
import { getSettings } from "@/lib/orders";
import { createStaff, saveCutoff, saveFactory, savePack, savePricing, saveProduct, updateStaff } from "./actions";

export default async function SettingsPage() {
  await requireRole("manager");
  const [settings, products, packs, factories, staff] = await Promise.all([
    getSettings(),
    db().from("products").select("*").order("id").then(unwrap),
    db().from("product_packs").select("*, products(name, price_per_kg)").order("product_id").order("kg_per_unit").then(unwrap),
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
            <h2>Giá sỉ / giá lẻ</h2>
          </CardTitle>
          <CardDescription>
            Giá lẻ = Giá sỉ × (1 + % chênh lệch), làm tròn 100đ. Đơn được giá sỉ (cả đơn) khi đủ số kg tối thiểu hoặc tổng tiền theo giá lẻ đủ
            mức tối thiểu. Thay đổi chỉ áp dụng cho đơn mới.
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
              <Input id="wholesale_min_total" name="wholesale_min_total" type="number" step={1000} min={0} defaultValue={settings.wholesale_min_total} required />
            </Field>
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
                <TableHead>Giá sỉ/kg</TableHead>
                <TableHead>Giá lẻ/kg</TableHead>
                <TableHead>Xưởng</TableHead>
                <TableHead>Ảnh</TableHead>
                <TableHead>Mô tả</TableHead>
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
                      <Input form={form} name="price_per_kg" type="number" defaultValue={p?.price_per_kg} placeholder="Giá sỉ/kg" required className="w-28" />
                    </TableCell>
                    <TableCell className="align-middle text-muted-foreground">
                      {p && formatVnd(retailPerKg(p.price_per_kg, settings.retail_markup_pct))}
                    </TableCell>
                    <TableCell>
                      <NativeSelect form={form} name="factory_id" required defaultValue={p?.factory_id ?? ""} aria-label={`Xưởng làm ${p?.name ?? "sản phẩm mới"}`} className="min-w-36">
                        <NativeSelectOption value="" disabled>
                          Chọn xưởng
                        </NativeSelectOption>
                        {factories.map((f) => (
                          <NativeSelectOption key={f.id} value={f.id}>
                            {f.name}
                            {f.active ? "" : " (ngừng)"}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Input form={form} name="image_url" defaultValue={p?.image_url ?? ""} placeholder="Link ảnh" className="min-w-40" />
                        <ImageFileInput form={form} label={`Tải ảnh ${p?.name ?? "sản phẩm mới"}`} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Textarea
                        form={form}
                        name="description"
                        defaultValue={p?.description ?? ""}
                        placeholder="Nguyên liệu, cách dùng, hạn dùng"
                        aria-label={`Mô tả ${p?.name ?? "sản phẩm mới"}`}
                        maxLength={1000}
                        rows={2}
                        className="min-h-9 min-w-56 text-sm"
                      />
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
            <h2>Quy cách đóng gói</h2>
          </CardTitle>
          <CardDescription>Mỗi quy cách là một số kg cố định. Khách chọn quy cách và số lượng; sản xuất vẫn tính theo kg.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Quy cách</TableHead>
                <TableHead>Kg/đơn vị</TableHead>
                <TableHead>Giá sỉ / lẻ</TableHead>
                <TableHead>Ảnh quy cách</TableHead>
                <TableHead>Đang bán</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...packs, null].map((pk, idx) => {
                const form = `pack-${pk?.id ?? "new"}`;
                const label = pk ? `${pk.products?.name} - ${packSize(pk)}` : "mới";
                const wholesale = pk?.products?.price_per_kg ?? 0;
                const firstOfProduct = pk && packs[idx - 1]?.product_id !== pk.product_id;
                return (
                  <TableRow key={form} className={firstOfProduct && idx > 0 ? "border-t-2 align-top" : "align-top"} data-pack={pk ? label : undefined}>
                    <TableCell className={pk ? "align-middle font-medium" : undefined}>
                      {pk ? (
                        firstOfProduct && pk.products?.name
                      ) : (
                        <NativeSelect form={form} name="product_id" defaultValue="" aria-label="Sản phẩm của quy cách mới" className="min-w-36">
                          <NativeSelectOption value="" disabled>
                            Chọn sản phẩm
                          </NativeSelectOption>
                          {products.map((p) => (
                            <NativeSelectOption key={p.id} value={p.id}>
                              {p.name}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input form={form} name="name" defaultValue={pk?.name} placeholder="Thùng, Bao..." aria-label={`Tên quy cách ${label}`} required className="w-28" />
                    </TableCell>
                    <TableCell>
                      <Input
                        form={form}
                        name="kg_per_unit"
                        type="number"
                        step="0.01"
                        min={0}
                        defaultValue={pk?.kg_per_unit}
                        placeholder="kg"
                        aria-label={`Kg mỗi ${label}`}
                        required
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell className="align-middle whitespace-nowrap text-muted-foreground">
                      {pk &&
                        `${formatVnd(packPrice(pk.kg_per_unit, wholesale))} / ${formatVnd(packPrice(pk.kg_per_unit, retailPerKg(wholesale, settings.retail_markup_pct)))}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {pk?.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pk.image_url} alt="" className="size-9 shrink-0 rounded-md border bg-muted object-cover" />
                        ) : (
                          <div className="size-9 shrink-0 rounded-md border border-dashed" />
                        )}
                        <Input
                          form={form}
                          name="image_url"
                          defaultValue={pk?.image_url ?? ""}
                          placeholder="/packs/thung.svg"
                          aria-label={`Ảnh ${label}`}
                          maxLength={500}
                          className="min-w-40"
                        />
                        <ImageFileInput form={form} label={`Tải ảnh ${label}`} />
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Checkbox form={form} name="active" defaultChecked={pk?.active ?? true} aria-label={`Đang bán ${label}`} />
                    </TableCell>
                    <TableCell>
                      <ActionForm id={form} action={savePack}>
                        <input type="hidden" name="id" value={pk?.id ?? ""} />
                        {pk && <input type="hidden" name="product_id" value={pk.product_id} />}
                        <Button variant={pk ? "outline" : "default"} aria-label={pk ? `Lưu ${label}` : "Thêm quy cách"}>
                          {pk ? "Lưu" : "Thêm"}
                        </Button>
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
