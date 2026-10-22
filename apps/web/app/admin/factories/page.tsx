import Link from "next/link";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unwrap } from "@noodle/core/action";
import { requireRole } from "@/lib/auth";
import { db } from "@noodle/core/db";
import { formatKg } from "@noodle/core/domain/money";
import { parseIsoDate } from "@noodle/core/domain/time";
import { jobKg, jobsInMonth } from "@/lib/factory-stats";
import { today } from "@/lib/period";
import { FactoryDialog } from "./FactoryDialog";

export default async function FactoriesPage({ searchParams }: PageProps<"/admin/factories">) {
  await requireRole("manager");
  const raw = (await searchParams).month;
  const month = (typeof raw === "string" && parseIsoDate(`${raw}-01`)?.slice(0, 7)) || today().slice(0, 7);
  const [factories, jobs] = await Promise.all([
    db().from("factories").select("id, name, address, phone, active").order("id").then(unwrap),
    jobsInMonth(month),
  ]);

  const rows = factories.map((f) => {
    const mine = jobs.filter((j) => j.factory_id === f.id);
    const received = mine.filter((j) => j.status === "received");
    const days = new Set(mine.map((j) => j.date)).size;
    const produced = received.reduce((s, j) => s + jobKg(j), 0);
    const producing = mine.filter((j) => j.status === "producing").reduce((s, j) => s + j.qty_kg, 0);
    const perDay = days ? Math.round((produced + producing) / days) : 0;
    return { ...f, jobs: mine.length, days, produced, producing, perDay };
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 [&_h1]:mb-0">
        <PageTitle>Xưởng tháng {month}</PageTitle>
        <FactoryDialog />
      </div>
      <AutoSubmitForm action="/admin/factories" className="my-4">
        <Input type="month" name="month" defaultValue={month} aria-label="Chọn tháng" className="w-auto" />
      </AutoSubmitForm>
      <Card size="sm">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Xưởng</TableHead>
                <TableHead className="text-right">Đã sản xuất</TableHead>
                <TableHead className="text-right">Đang sản xuất</TableHead>
                <TableHead className="text-right">Số lệnh</TableHead>
                <TableHead className="text-right">Ngày có lệnh</TableHead>
                <TableHead className="text-right">TB kg/ngày</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className={`relative cursor-pointer ${r.active ? "" : "opacity-60"}`} data-factory-id={r.id}>
                  <TableCell>
                    <Link href={`/admin/factories/${r.id}?month=${month}`} className="font-medium text-primary after:absolute after:inset-0 hover:underline">
                      {r.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{[r.address, r.phone, !r.active && "Ngừng hoạt động"].filter(Boolean).join(" · ")}</div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums" data-testid={`factory-produced-${r.id}`}>
                    {formatKg(r.produced)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">{r.producing ? formatKg(r.producing) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.jobs}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.days}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.days ? formatKg(r.perDay) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="relative z-10 inline-block">
                      <FactoryDialog factory={r} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Tổng</TableCell>
                <TableCell className="text-right tabular-nums">{formatKg(rows.reduce((s, r) => s + r.produced, 0))}</TableCell>
                <TableCell className="text-right tabular-nums">{formatKg(rows.reduce((s, r) => s + r.producing, 0))}</TableCell>
                <TableCell className="text-right tabular-nums">{rows.reduce((s, r) => s + r.jobs, 0)}</TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableFooter>
          </Table>
          <p className="mt-2 text-xs text-muted-foreground">
            Theo ngày sản xuất. “Đã sản xuất” là kg quản lý đã nhận.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
