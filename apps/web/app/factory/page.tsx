import { PageTitle } from "@/components/page-title";
import { JobBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatKg } from "@noodle/core/domain/money";
import { factoryDays, type FactoryDayRow } from "@noodle/core/queries/factory";

function DayTable({ rows, draft }: { rows: FactoryDayRow[]; draft: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sản phẩm</TableHead>
          <TableHead className="text-right">Kg</TableHead>
          <TableHead>Trạng thái</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.key} data-job-id={draft ? undefined : r.key}>
            <TableCell className="font-medium">{r.product}</TableCell>
            <TableCell className="text-right tabular-nums">{formatKg(r.kg)}</TableCell>
            <TableCell>{r.status ? <JobBadge status={r.status} /> : <Badge variant="outline">Dự kiến</Badge>}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Tổng</TableCell>
          <TableCell className="text-right tabular-nums">{formatKg(rows.reduce((s, r) => s + r.kg, 0))}</TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  );
}

export default async function FactoryPage() {
  const me = await requireRole("factory");
  const days = await factoryDays(me.factory_id!);

  return (
    <>
      <PageTitle>Lệnh sản xuất</PageTitle>
      <p className="mb-4 text-sm text-muted-foreground">
        Trước khi quản lý chốt, xưởng thấy số kg dự kiến của cả ngày để chuẩn bị. Sau khi chốt, đây là lệnh chính thức của xưởng.
      </p>
      <div className="space-y-4">
        {days.map(({ closed: isClosed, rows, ...d }) => {
          return (
            <Card key={d.date} size="sm" data-factory-day={d.date}>
              <CardHeader>
                <CardTitle>
                  <h2 className="flex flex-wrap items-center gap-2">
                    {d.label} <span className="font-normal text-muted-foreground">· {d.date}</span>
                    {isClosed ? <Badge variant="secondary">Đã chốt</Badge> : <Badge variant="outline">Dự kiến (chưa chốt)</Badge>}
                  </h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{isClosed ? "Xưởng không có lệnh ngày này." : "Chưa có đơn."}</p>
                ) : (
                  <>
                    <DayTable rows={rows} draft={!isClosed} />
                    {!isClosed && (
                      <p className="mt-2 text-xs text-muted-foreground">Tổng nhu cầu của cả ngày, chưa chia cho từng xưởng. Số kg có thể thay đổi đến khi chốt.</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
