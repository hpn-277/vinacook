import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatVnd } from "@/lib/domain/money";
import { parseIsoDate } from "@/lib/domain/time";
import { today } from "@/lib/period";

export default async function CommissionPage({ searchParams }: PageProps<"/admin/commission">) {
  await requireRole("manager");
  const raw = (await searchParams).month;
  const month = (typeof raw === "string" && parseIsoDate(`${raw}-01`)) || today().slice(0, 7);
  const rows = unwrap(await db().rpc("commission_report", { p_month: `${month}-01` }));
  const total = rows.reduce((s, r) => s + r.commission, 0);

  return (
    <>
      <PageTitle>Hoa hồng tháng {month}</PageTitle>
      <form className="mb-4 flex gap-2">
        <Input type="month" name="month" defaultValue={month} className="w-auto" />
        <Button variant="outline">Xem</Button>
      </form>
      <Card size="sm">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhân viên</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead className="text-right">Số đơn đã giao</TableHead>
                <TableHead className="text-right">Doanh số đã giao</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Hoa hồng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.sale_id} data-ref={r.ref_code}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="font-mono">{r.ref_code}</TableCell>
                  <TableCell className="text-right">{r.delivered_count}</TableCell>
                  <TableCell className="text-right">{formatVnd(r.delivered_total)}</TableCell>
                  <TableCell className="text-right">{r.commission_pct}%</TableCell>
                  <TableCell className="text-right font-semibold" data-testid={`commission-${r.ref_code}`}>
                    {formatVnd(r.commission)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5}>Tổng</TableCell>
                <TableCell className="text-right">{formatVnd(total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
