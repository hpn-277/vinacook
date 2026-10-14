import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { Button, Card, inputClass, PageTitle } from "@/components/ui";
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
        <input type="date" name="date" defaultValue={date} className={`${inputClass} w-auto`} />
        <Button tone="secondary">Xem</Button>
      </form>
      {jobs.length === 0 && <p>Chưa có lệnh sản xuất cho ngày này.</p>}
      {unresolvedReject && (
        <Card className="mb-4 border-amber-300 bg-amber-50 text-sm">
          Có lệnh bị từ chối chưa giao lại.{" "}
          <Link href={`/admin/production/${date}`} className="underline">
            Giao lại
          </Link>
        </Card>
      )}
      {byProduct.size > 0 && (
        <Card className="mb-4">
          <h2 className="mb-2 font-semibold">Kế hoạch / thực nhận</h2>
          <table className="w-full text-sm">
            <tbody>
              {[...byProduct.values()].map((r) => {
                const short = Math.round((r.planned - r.received) * 100) / 100;
                return (
                  <tr key={r.name} className="border-t" data-shortfall-product={r.name}>
                    <td className="p-1">{r.name}</td>
                    <td className="p-1">{formatKg(r.planned)}</td>
                    <td className="p-1">{formatKg(r.received)}</td>
                    <td className="p-1">
                      {r.pending ? (
                        <span className="text-gray-500">đang chờ</span>
                      ) : short > 0 ? (
                        <b className="text-red-700" data-testid="shortfall">
                          Thiếu {formatKg(short)}
                        </b>
                      ) : (
                        <span className="text-green-700">Đủ</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-500">
            Thiếu hàng: sửa số kg trên các đơn bị ảnh hưởng tại{" "}
            <Link href={`/admin/orders?date=${date}`} className="underline">
              trang đơn hàng
            </Link>
            .
          </p>
        </Card>
      )}
      <ul className="space-y-2">
        {jobs.map((j) => (
          <li key={j.id}>
            <Card className="flex flex-wrap items-center gap-2 text-sm">
              <b>#{j.id}</b> {j.products?.name} · {formatKg(j.qty_kg)} · {j.factories?.name}
              <JobBadge status={j.status} />
              {j.received_kg != null && <span>Thực nhận {formatKg(j.received_kg)}</span>}
              {j.status === "shipped" && (
                <ActionForm action={receiveJob} className="ml-auto flex gap-2">
                  <input type="hidden" name="job_id" value={j.id} />
                  <input
                    name="received_kg"
                    aria-label={`Thực nhận lệnh ${j.id}`}
                    type="number"
                    step={0.5}
                    min={0}
                    defaultValue={j.qty_kg}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-right"
                  />
                  <Button>Nhận</Button>
                </ActionForm>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
