import { Button, Card, inputClass, PageTitle } from "@/components/ui";
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
        <input type="month" name="month" defaultValue={month} className={`${inputClass} w-auto`} />
        <Button tone="secondary">Xem</Button>
      </form>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Nhân viên</th>
              <th className="p-2">Mã</th>
              <th className="p-2">Số đơn đã giao</th>
              <th className="p-2">Doanh số đã giao</th>
              <th className="p-2">%</th>
              <th className="p-2">Hoa hồng</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sale_id} className="border-t" data-ref={r.ref_code}>
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.ref_code}</td>
                <td className="p-2">{r.delivered_count}</td>
                <td className="p-2">{formatVnd(r.delivered_total)}</td>
                <td className="p-2">{r.commission_pct}%</td>
                <td className="p-2 font-semibold" data-testid={`commission-${r.ref_code}`}>
                  {formatVnd(r.commission)}
                </td>
              </tr>
            ))}
            <tr className="border-t font-semibold">
              <td className="p-2" colSpan={5}>
                Tổng
              </td>
              <td className="p-2">{formatVnd(total)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </>
  );
}
