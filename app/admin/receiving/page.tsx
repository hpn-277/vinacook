import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/page-title";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JobBadge } from "@/components/status-badge";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatKg } from "@/lib/domain/money";
import { parseIsoDate } from "@/lib/domain/time";
import { today } from "@/lib/period";
import { receiveJob } from "./actions";

export default async function ReceivingPage({ searchParams }: PageProps<"/admin/receiving">) {
  await requireRole("manager");
  const sp = await searchParams;
  const date = parseIsoDate(typeof sp.date === "string" ? sp.date : null) ?? today();
  const jobs = unwrap(
    await db()
      .from("production_jobs")
      .select("id, product_id, qty_kg, status, received_kg, replaced_by, products(name), factories(name)")
      .eq("date", date)
      .order("product_id")
      .order("id"),
  );

  const byProduct = new Map<number, { name: string; planned: number; received: number; pending: boolean }>();
  for (const j of jobs) {
    if (j.status === "rejected") continue;
    const row = byProduct.get(j.product_id) ?? { name: j.products?.name ?? "?", planned: 0, received: 0, pending: false };
    row.planned += j.qty_kg;
    row.received += j.received_kg ?? 0;
    row.pending ||= j.status !== "received";
    byProduct.set(j.product_id, row);
  }
  const unresolvedReject = jobs.some((j) => j.status === "rejected" && !j.replaced_by);

  return (
    <>
      <PageTitle>Nhận hàng ngày {date}</PageTitle>
      <form className="mb-4 flex gap-2">
        <Input type="date" name="date" defaultValue={date} className="w-auto" />
        <Button variant="outline">Xem</Button>
      </form>
      {jobs.length === 0 && <p className="text-muted-foreground">Chưa có lệnh sản xuất cho ngày này.</p>}
      {unresolvedReject && (
        <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-900">
          <AlertDescription className="text-amber-900">
            <p>
              Có lệnh bị từ chối chưa giao lại. <Link href={`/admin/production/${date}`}>Giao lại</Link>
            </p>
          </AlertDescription>
        </Alert>
      )}
      {byProduct.size > 0 && (
        <Card size="sm" className="mb-4">
          <CardHeader>
            <CardTitle className="font-semibold">
              <h2>Kế hoạch / thực nhận</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">Kế hoạch</TableHead>
                  <TableHead className="text-right">Thực nhận</TableHead>
                  <TableHead>Tình trạng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...byProduct.values()].map((r) => {
                  const short = Math.round((r.planned - r.received) * 100) / 100;
                  return (
                    <TableRow key={r.name} data-shortfall-product={r.name}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">{formatKg(r.planned)}</TableCell>
                      <TableCell className="text-right">{formatKg(r.received)}</TableCell>
                      <TableCell>
                        {r.pending ? (
                          <span className="text-muted-foreground">đang chờ</span>
                        ) : short > 0 ? (
                          <b className="text-destructive" data-testid="shortfall">
                            Thiếu {formatKg(short)}
                          </b>
                        ) : (
                          <span className="text-green-700">Đủ</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <p className="mt-2 text-xs text-muted-foreground">
              Thiếu hàng: sửa số kg trên các đơn bị ảnh hưởng tại{" "}
              <Link href={`/admin/orders?date=${date}`} className="text-primary underline underline-offset-4">
                trang đơn hàng
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}
      <ul className="space-y-2">
        {jobs.map((j) => (
          <li key={j.id}>
            <Card size="sm">
              <CardContent className="flex flex-wrap items-center gap-2">
                <b>#{j.id}</b> {j.products?.name} · {formatKg(j.qty_kg)} · {j.factories?.name}
                <JobBadge status={j.status} />
                {j.received_kg != null && <span className="text-muted-foreground">Thực nhận {formatKg(j.received_kg)}</span>}
                {j.status === "shipped" && (
                  <ActionForm action={receiveJob} className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                    <input type="hidden" name="job_id" value={j.id} />
                    <Input
                      name="received_kg"
                      aria-label={`Thực nhận lệnh ${j.id}`}
                      type="number"
                      step={0.5}
                      min={0}
                      defaultValue={j.qty_kg}
                      className="w-28 text-right"
                    />
                    <Button>Nhận</Button>
                  </ActionForm>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
