import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { DebtTable, type DebtCustomer } from "@/components/DebtTable";
import { PageTitle } from "@/components/page-title";
import { StatTiles } from "@/components/StatTiles";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { unwrap } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { groupDebts, OVERDUE_DAYS, paymentTotals } from "@/lib/domain/debt";
import { formatVnd } from "@/lib/domain/money";
import type { OrderStatus } from "@/lib/domain/status";
import { monthRange, today } from "@/lib/period";

const DEBT_SELECT =
  "id, code, status, total, production_date, delivered_at, district, phone, customer_id, customer:customers(name, phone, default_district, owner:staff(id, name)), driver:staff!orders_driver_id_fkey(name)";

const STATUS_FILTERS = {
  all: { label: "Tất cả trạng thái", keep: () => true },
  delivered: { label: "Đã giao", keep: (s: OrderStatus) => s === "delivered" },
  undelivered: { label: "Chưa giao", keep: (s: OrderStatus) => s !== "delivered" },
} as const;
type StatusFilter = keyof typeof STATUS_FILTERS;
const NO_SALE = "none";

export default async function DebtPage({ searchParams }: PageProps<"/finance">) {
  const me = await requireRole("cashier", "accountant");
  const sp = await searchParams;
  const status: StatusFilter = typeof sp.status === "string" && sp.status in STATUS_FILTERS ? (sp.status as StatusFilter) : "all";
  const sale = typeof sp.sale === "string" ? sp.sale : "";
  const now = today();
  const month = monthRange(now);

  const [orders, events] = await Promise.all([
    db().from("orders").select(DEBT_SELECT).eq("payment_status", "unpaid").neq("status", "cancelled").order("id").then(unwrap),
    db().from("payment_events").select("action, amount").gte("created_at", month.from).lt("created_at", month.to).then(unwrap),
  ]);

  const groups = groupDebts(orders, now);
  const owed = orders.reduce((s, o) => s + o.total, 0);
  const overdue = groups.flatMap((g) => g.orders).filter((o) => o.age > OVERDUE_DAYS);
  const collected = paymentTotals(events);
  const sales = [...new Map(orders.flatMap((o) => (o.customer?.owner ? [[o.customer.owner.id, o.customer.owner.name] as const] : [])))].sort((a, b) =>
    a[1].localeCompare(b[1], "vi"),
  );

  const customers: DebtCustomer[] = groups
    .filter((g) => sale === "" || String(g.orders[0].customer?.owner?.id ?? NO_SALE) === sale)
    .map((g) => {
      const first = g.orders[0];
      const owner = first.customer?.owner ?? null;
      const shown = g.orders.filter((o) => STATUS_FILTERS[status].keep(o.status));
      return {
        id: g.customerId,
        name: first.customer?.name ?? "?",
        phone: first.customer?.phone ?? first.phone,
        district: first.customer?.default_district ?? first.district,
        sale: owner?.name ?? null,
        total: shown.reduce((s, o) => s + o.total, 0),
        oldest: Math.max(0, ...shown.map((o) => o.age)),
        orders: shown.map((o) => ({ id: o.id, code: o.code, status: o.status, total: o.total, production_date: o.production_date, driver: o.driver?.name ?? null, age: o.age })),
      };
    })
    .filter((c) => c.orders.length > 0);

  return (
    <>
      <PageTitle>Công nợ</PageTitle>
      <StatTiles
        tiles={[
          { label: "Tổng chưa thu", value: formatVnd(owed), note: `${groups.length} khách đang nợ`, warn: owed > 0 },
          { label: "Số đơn chưa thu", value: String(orders.length), note: "Không tính đơn hủy" },
          {
            label: "Đã thu tháng này",
            value: formatVnd(collected.net),
            note: collected.reversed ? `Thu ${formatVnd(collected.received)}, hoàn tác ${formatVnd(collected.reversed)}` : `Tháng ${now.slice(0, 7)}`,
          },
          {
            label: `Quá hạn >${OVERDUE_DAYS} ngày`,
            value: formatVnd(overdue.reduce((s, o) => s + o.total, 0)),
            note: `${overdue.length} đơn`,
            warn: overdue.length > 0,
          },
        ]}
      />

      <AutoSubmitForm action="/finance" className="mb-3 flex flex-wrap gap-2">
        <NativeSelect name="status" defaultValue={status} aria-label="Lọc theo trạng thái">
          {Object.entries(STATUS_FILTERS).map(([value, f]) => (
            <NativeSelectOption key={value} value={value}>
              {f.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect name="sale" defaultValue={sale} aria-label="Lọc theo NVKD">
          <NativeSelectOption value="">Tất cả NVKD</NativeSelectOption>
          {sales.map(([id, name]) => (
            <NativeSelectOption key={id} value={String(id)}>
              {name}
            </NativeSelectOption>
          ))}
          <NativeSelectOption value={NO_SALE}>Khách vãng lai</NativeSelectOption>
        </NativeSelect>
      </AutoSubmitForm>

      <DebtTable key={`${status}-${sale}`} customers={customers} canSettle={me.role === "cashier"} />
    </>
  );
}
