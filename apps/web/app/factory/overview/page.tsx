import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatKg } from "@noodle/core/domain/money";
import { parseIsoDate } from "@noodle/core/domain/time";
import { jobsInMonth } from "@/lib/factory-stats";
import { today } from "@/lib/period";

export default async function FactoryOverviewPage({ searchParams }: PageProps<"/factory/overview">) {
  const me = await requireRole("factory");
  const raw = (await searchParams).month;
  const month = (typeof raw === "string" && parseIsoDate(`${raw}-01`)?.slice(0, 7)) || today().slice(0, 7);
  const jobs = await jobsInMonth(month, me.factory_id!);

  const produced = jobs.filter((j) => j.status === "received");
  const producedKg = produced.reduce((s, j) => s + (j.received_kg ?? j.qty_kg), 0);
  const inProgressKg = jobs.filter((j) => j.status === "producing").reduce((s, j) => s + j.qty_kg, 0);
  const days = [...new Set(jobs.map((j) => j.date))];

  const byProduct = new Map<string, number>();
  for (const j of produced) byProduct.set(j.products?.name ?? "?", (byProduct.get(j.products?.name ?? "?") ?? 0) + (j.received_kg ?? j.qty_kg));
  const productRows = [...byProduct].sort((a, b) => b[1] - a[1]);

  const tiles = [
    { label: "Đã sản xuất", value: formatKg(producedKg), note: `${produced.length} lệnh đã giao cho công ty` },
    { label: "Đang sản xuất", value: formatKg(inProgressKg), note: inProgressKg ? "Chờ quản lý nhận hàng" : "Không có" },
    { label: "Số ngày có lệnh", value: String(days.length), note: `Tháng ${month}` },
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
                  {productRows.map(([name, kg]) => (
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
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có lệnh trong tháng.</p>
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
                  {days.map((d) => {
                    const dayJobs = jobs.filter((j) => j.date === d);
                    const pending = dayJobs.some((j) => j.status === "producing");
                    return (
                      <TableRow key={d} data-factory-overview-day={d}>
                        <TableCell className="align-top tabular-nums">
                          {d.slice(8)}/{d.slice(5, 7)}
                          {pending && <div className="text-xs text-primary">Đang sản xuất</div>}
                        </TableCell>
                        <TableCell className="text-xs whitespace-normal text-muted-foreground">
                          {dayJobs.map((j) => `${j.products?.name} ${formatKg(j.received_kg ?? j.qty_kg)}`).join(", ")}
                        </TableCell>
                        <TableCell className="text-right align-top font-medium tabular-nums">
                          {formatKg(dayJobs.reduce((s, j) => s + (j.received_kg ?? j.qty_kg), 0))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
