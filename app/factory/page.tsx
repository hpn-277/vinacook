import { ActionForm } from "@/components/ActionForm";
import { StaffShell } from "@/components/StaffShell";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { JobBadge } from "@/components/status-badge";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatKg } from "@/lib/domain/money";
import { addDays } from "@/lib/domain/time";
import { today } from "@/lib/period";
import { moveJob } from "./actions";

export default async function FactoryPage() {
  const me = await requireRole("factory");
  const date = today();
  const jobs = unwrap(
    await db()
      .from("production_jobs")
      .select("id, date, qty_kg, status, received_kg, rejected_reason, products(name)")
      .eq("factory_id", me.factory_id!)
      .gte("date", date)
      .lte("date", addDays(date, 1))
      .order("date")
      .order("id"),
  );

  return (
    <StaffShell links={[{ href: "/factory", label: "Lệnh sản xuất" }]}>
      <PageTitle>Lệnh sản xuất hôm nay & ngày mai</PageTitle>
      {jobs.length === 0 && <p className="text-muted-foreground">Chưa có lệnh.</p>}
      <ul className="space-y-3">
        {jobs.map((j) => (
          <li key={j.id}>
            <Card data-job-id={j.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold">
                      {j.products?.name}: {formatKg(j.qty_kg)}
                    </div>
                    <div className="text-muted-foreground">
                      Lệnh #{j.id} · Ngày {j.date}
                    </div>
                  </div>
                  <JobBadge status={j.status} />
                </div>
                {j.rejected_reason && <div className="text-destructive">Lý do: {j.rejected_reason}</div>}
                {j.status === "assigned" && (
                  <div className="space-y-2">
                    <ActionForm action={moveJob}>
                      <input type="hidden" name="job_id" value={j.id} />
                      <input type="hidden" name="to" value="accepted" />
                      <Button className="h-11 w-full text-base">Nhận lệnh</Button>
                    </ActionForm>
                    <ActionForm action={moveJob} className="flex gap-2">
                      <input type="hidden" name="job_id" value={j.id} />
                      <input type="hidden" name="to" value="rejected" />
                      <Input name="reason" placeholder="Lý do từ chối" required className="h-11" />
                      <Button variant="destructive" className="h-11">
                        Từ chối
                      </Button>
                    </ActionForm>
                  </div>
                )}
                {j.status === "accepted" && (
                  <ActionForm action={moveJob}>
                    <input type="hidden" name="job_id" value={j.id} />
                    <input type="hidden" name="to" value="shipped" />
                    <Button className="h-11 w-full text-base">Đã xuất hàng</Button>
                  </ActionForm>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </StaffShell>
  );
}
