import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { JobBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { db } from "@noodle/core/db";
import { formatKg } from "@noodle/core/domain/money";
import { parseIsoDate } from "@noodle/core/domain/time";
import { jobKg, jobsInMonth } from "@/lib/factory-stats";
import { today } from "@/lib/period";

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default async function FactoryMonthPage({ params, searchParams }: PageProps<"/admin/factories/[factoryId]">) {
  await requireRole("manager");
  const factoryId = Number((await params).factoryId);
  const raw = (await searchParams).month;
  const month = (typeof raw === "string" && parseIsoDate(`${raw}-01`)?.slice(0, 7)) || today().slice(0, 7);
  if (!Number.isInteger(factoryId)) notFound();
  const { data: factory } = await db().from("factories").select("id, name, address, phone, active").eq("id", factoryId).maybeSingle();
  if (!factory) notFound();

  const jobs = await jobsInMonth(month, factoryId);
  const days = [...Map.groupBy(jobs, (j) => j.date)];
  const produced = jobs.filter((j) => j.status === "received").reduce((s, j) => s + jobKg(j), 0);
  const producing = jobs.filter((j) => j.status === "producing").reduce((s, j) => s + j.qty_kg, 0);
  const products = [...Map.groupBy(jobs, (j) => j.products?.name ?? "?")]
    .map(([name, js]) => ({ name, kg: js.reduce((s, j) => s + jobKg(j), 0), jobs: js.length }))
    .sort((a, b) => b.kg - a.kg);
  const total = produced + producing;
  const peak = days.reduce((m, [, js]) => Math.max(m, js.reduce((s, j) => s + jobKg(j), 0)), 0);

  const tiles = [
    { label: "Đã sản xuất", value: formatKg(produced), note: `${jobs.filter((j) => j.status === "received").length} lệnh đã nhận` },
    { label: "Đang sản xuất", value: formatKg(producing), note: producing ? "Chờ quản lý nhận hàng" : "Không có" },
    { label: "Ngày có lệnh", value: String(days.length), note: days.length ? `TB ${formatKg(Math.round(total / days.length))}/ngày` : "—" },
    { label: "Ngày cao nhất", value: formatKg(peak), note: "Tổng kg một ngày" },
  ];

  return (
    <>
      <Link href={`/admin/factories?month=${month}`} className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">
        ‹ Xưởng tháng {month}
      </Link>
      <PageTitle>
        {factory.name}{" "}
        <span className="text-base font-normal text-muted-foreground">
          {[factory.address, factory.phone].filter(Boolean).join(" · ")}
        </span>
      </PageTitle>
      <AutoSubmitForm action={`/admin/factories/${factoryId}`} className="mb-4">
        <Input type="month" name="month" defaultValue={month} aria-label="Chọn tháng" className="w-auto" />
      </AutoSubmitForm>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{t.label}</span>
              <span className="text-xl font-bold tabular-nums sm:text-2xl">{t.value}</span>
              <span className="text-xs text-muted-foreground">{t.note}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card size="sm">
          <CardHeader>
            <CardTitle>
              <h2>Lịch sử sản xuất theo ngày</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có lệnh trong tháng.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày / Sản phẩm</TableHead>
                    <TableHead className="text-right">Kế hoạch</TableHead>
                    <TableHead className="text-right">Thực nhận</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map(([d, js]) => {
                    const dayKg = js.reduce((s, j) => s + jobKg(j), 0);
                    return (
                      <Fragment key={d}>
                        <TableRow className="bg-muted/50 font-medium hover:bg-muted/50" data-factory-history-day={d}>
                          <TableCell className="tabular-nums">
                            <Link href={`/admin/production/${d}`} className="hover:underline">
                              {dm(d)}
                            </Link>{" "}
                            <span className="font-normal text-muted-foreground">· {js.length} lệnh</span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatKg(js.reduce((s, j) => s + j.qty_kg, 0))}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatKg(dayKg)}</TableCell>
                          <TableCell />
                        </TableRow>
                        {js.map((j) => (
                          <TableRow key={j.id}>
                            <TableCell className="pl-6">
                              <span className="text-muted-foreground">#{j.id}</span> {j.products?.name}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground tabular-nums">{formatKg(j.qty_kg)}</TableCell>
                            <TableCell className="text-right text-muted-foreground tabular-nums">{j.received_kg != null ? formatKg(j.received_kg) : "—"}</TableCell>
                            <TableCell>
                              <JobBadge status={j.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Tổng · {jobs.length} lệnh</TableCell>
                    <TableCell className="text-right tabular-nums">{formatKg(jobs.reduce((s, j) => s + j.qty_kg, 0))}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatKg(produced)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="self-start">
          <CardHeader>
            <CardTitle>
              <h2>Theo sản phẩm</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <Table>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatKg(p.kg)}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">{total ? Math.round((p.kg / total) * 100) : 0}%</TableCell>
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
