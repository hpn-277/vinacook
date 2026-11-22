import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatKg } from "@noodle/core/domain/money";
import { factoryMonth } from "@noodle/core/queries/factory";

export default async function FactoryOverviewPage({ searchParams }: PageProps<"/factory/overview">) {
  const me = await requireRole("factory");
  const raw = (await searchParams).month;
  const { month, producedKg, producedCount, inProgressKg, products: productRows, days } = await factoryMonth(me.factory_id!, typeof raw === "string" ? raw : undefined);

  const tiles = [
    { label: "Đã sản xuất", value: formatKg(producedKg), note: `${producedCount} mặt hàng đã giao cho công ty` },
    { label: "Đang sản xuất", value: formatKg(inProgressKg), note: inProgressKg ? "Chờ quản lý nhận hàng" : "Không có" },
    { label: "Số ngày có đơn", value: String(days.length), note: `Tháng ${month}` },
  ];

  return (
    <>
      <PageTitle>Sản lượng tháng {month}</PageTitle>
      <AutoSubmitForm action="/factory/overview" className="mb-4">
        <Input type="month" name="month" defaultValue={month} aria-label="Chọn tháng" className="w-auto" />
      </AutoSubmitForm>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{t.label}</span>
              <span className="text-2xl font-bold tabular-nums" data-testid={`factory-${t.label}`}>
                {t.value}
              </span>
              <span className="text-xs text-muted-foreground">{t.note}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>
              <h2>Theo sản phẩm</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có sản lượng trong tháng.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Đã sản xuất</TableHead>
                    <TableHead className="text-right">Tỷ trọng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productRows.map(({ name, kg }) => (
                    <TableRow key={name}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatKg(kg)}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">{Math.round((kg / producedKg) * 100)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Tổng</TableCell>
                    <TableCell className="text-right tabular-nums">{formatKg(producedKg)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>
              <h2>Theo ngày</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {days.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có đơn trong tháng.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Kg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map((d) => (
                    <TableRow key={d.date} data-factory-overview-day={d.date}>
                      <TableCell className="align-top tabular-nums">
                        {d.date.slice(8)}/{d.date.slice(5, 7)}
                        {d.pending && <div className="text-xs text-primary">Đang sản xuất</div>}
                      </TableCell>
                      <TableCell className="text-xs whitespace-normal text-muted-foreground">
                        {d.jobs.map((j) => `${j.product} ${formatKg(j.kg)}`).join(", ")}
                      </TableCell>
                      <TableCell className="text-right align-top font-medium tabular-nums">{formatKg(d.kg)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
