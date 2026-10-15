import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/page-title";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { JobBadge } from "@/components/status-badge";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatKg } from "@/lib/domain/money";
import { parseIsoDate } from "@/lib/domain/time";
import { closeDay, reassignJob } from "./actions";
import { AllocationForm } from "./AllocationForm";

export default async function ProductionDayPage({ params }: PageProps<"/admin/production/[date]">) {
  await requireRole("manager");
  const date = parseIsoDate((await params).date);
  if (!date) notFound();

  const [day, placed, approvedItems, factories, jobs] = await Promise.all([
    db().from("production_days").select("status, closed_at").eq("date", date).maybeSingle(),
    db().from("orders").select("id", { count: "exact", head: true }).eq("production_date", date).eq("status", "placed"),
    db().from("order_items").select("product_id, qty_kg, products(name), orders!inner(production_date, status)").eq("orders.production_date", date).eq("orders.status", "approved").then(unwrap),
    db().from("factories").select("id, name, capacity_kg_per_day").eq("active", true).order("id").then(unwrap),
    db().from("production_jobs").select("id, product_id, factory_id, qty_kg, status, received_kg, rejected_reason, replaced_by, products(name), factories(name)").eq("date", date).order("product_id").order("id").then(unwrap),
  ]);
  const closed = day.data?.status === "closed";
  const placedCount = placed.count ?? 0;

  const needs = new Map<number, { id: number; name: string; need: number }>();
  for (const i of approvedItems) {
    const n = needs.get(i.product_id) ?? { id: i.product_id, name: i.products?.name ?? "?", need: 0 };
    n.need = Math.round((n.need + i.qty_kg) * 100) / 100;
    needs.set(i.product_id, n);
  }

  return (
    <>
      <PageTitle>Sản xuất ngày {date}</PageTitle>
      <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span>
          Trạng thái: <b>{closed ? "Đã chốt" : "Đang mở"}</b>
        </span>
        <span className="text-muted-foreground">·</span>
        <Link href={`/admin/orders?date=${date}`} className="text-primary underline underline-offset-4">
          Xem đơn
        </Link>
      </p>

      {!closed && placedCount > 0 && (
        <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-900">
          <AlertDescription className="text-amber-900">
            <p>
              Còn <b>{placedCount}</b> đơn chưa duyệt. Duyệt hoặc hủy hết trước khi chốt.{" "}
              <Link href={`/admin/orders?date=${date}`}>Duyệt đơn</Link>
            </p>
          </AlertDescription>
        </Alert>
      )}
      {!closed && placedCount === 0 && needs.size === 0 && <p className="text-muted-foreground">Chưa có đơn đã duyệt cho ngày này.</p>}
      {!closed && placedCount === 0 && needs.size > 0 && (
        <Card size="sm">
          <CardContent>
            <AllocationForm
              date={date}
              needs={[...needs.values()]}
              factories={factories.map((f) => ({ id: f.id, name: f.name, capacity: f.capacity_kg_per_day }))}
              action={closeDay}
            />
          </CardContent>
        </Card>
      )}

      {jobs.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 font-semibold">Lệnh sản xuất</h2>
          <ul className="space-y-2">
            {jobs.map((j) => (
              <li key={j.id}>
                <Card size="sm">
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <b>#{j.id}</b> {j.products?.name} · {formatKg(j.qty_kg)} · {j.factories?.name}
                      <JobBadge status={j.status} />
                      {j.received_kg != null && <span className="text-muted-foreground">Nhận {formatKg(j.received_kg)}</span>}
                    </div>
                    {j.rejected_reason && <div className="text-destructive">Lý do từ chối: {j.rejected_reason}</div>}
                    {j.status === "rejected" && j.replaced_by && <div className="text-muted-foreground">Đã giao lại: lệnh #{j.replaced_by}</div>}
                    {j.status === "rejected" && !j.replaced_by && (
                      <ActionForm action={reassignJob} className="flex flex-wrap gap-2">
                        <input type="hidden" name="job_id" value={j.id} />
                        <NativeSelect name="factory_id" required aria-label="Xưởng nhận lại">
                          {factories
                            .filter((f) => f.id !== j.factory_id)
                            .map((f) => (
                              <NativeSelectOption key={f.id} value={f.id}>
                                {f.name}
                              </NativeSelectOption>
                            ))}
                        </NativeSelect>
                        <Button>Giao lại</Button>
                      </ActionForm>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
