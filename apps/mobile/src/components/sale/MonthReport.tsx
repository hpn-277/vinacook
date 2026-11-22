import { Text, View } from "react-native";
import { formatVnd } from "@noodle/core/domain/money";
import type { SaleMonth } from "@noodle/core/queries/sale";
import { Badge, Body, Card, Heading, Muted, Row, colors } from "@/components/ui";

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** The web SaleMonthReport: month tiles, delivered orders by day, customers. */
export function MonthReport({ report: r }: { report: SaleMonth }) {
  const tiles = [
    { label: "Đơn đã giao", value: String(r.orders), note: `Trong tháng ${r.month}`, testID: "sale-delivered" },
    { label: "Doanh số đã giao", value: formatVnd(r.sales), note: `${r.days.length} ngày có đơn giao`, testID: "sale-sales" },
    { label: `Hoa hồng (${r.pct}%)`, value: formatVnd(r.commission), note: "Tính trên đơn đã giao", testID: "sale-commission" },
    { label: "Khách hàng", value: String(r.customers.length), note: `${r.newCustomers} khách có đơn đầu tiên trong tháng`, testID: "sale-customers" },
  ];
  return (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {tiles.map((t) => (
          <Card key={t.label} style={{ flexBasis: "47%", flexGrow: 1, gap: 2 }}>
            <Muted>{t.label}</Muted>
            <Text testID={t.testID} style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
              {t.value}
            </Text>
            <Muted style={{ fontSize: 12 }}>{t.note}</Muted>
          </Card>
        ))}
      </View>

      <Card>
        <Heading>Đơn đã giao theo ngày</Heading>
        {r.days.length === 0 ? (
          <Muted>Chưa có đơn giao trong tháng.</Muted>
        ) : (
          <>
            {r.days.map((day) => (
              <View key={day.date} testID={`commission-day-${day.date}`} style={{ gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Body style={{ fontWeight: "600" }}>
                    {dm(day.date)} <Muted>· {day.orders.length} đơn</Muted>
                  </Body>
                  <Body style={{ fontWeight: "600" }}>
                    {formatVnd(day.sales)} · {formatVnd(day.commission)}
                  </Body>
                </Row>
                {day.orders.map((o) => (
                  <Row key={o.code} style={{ justifyContent: "space-between", paddingLeft: 12 }}>
                    <Muted>
                      {o.code} · {o.customer}
                    </Muted>
                    <Muted>
                      {formatVnd(o.total)} · {formatVnd(o.commission)}
                    </Muted>
                  </Row>
                ))}
              </View>
            ))}
            <Row style={{ justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
              <Body style={{ fontWeight: "700" }}>Tổng · {r.orders} đơn</Body>
              <Body style={{ fontWeight: "700" }}>
                {formatVnd(r.sales)} · {formatVnd(r.commission)}
              </Body>
            </Row>
            <Muted style={{ fontSize: 12 }}>Doanh số · Hoa hồng</Muted>
          </>
        )}
      </Card>

      <Card>
        <Heading>Khách hàng phụ trách ({r.customers.length})</Heading>
        {r.customers.length === 0 ? (
          <Muted>Chưa có khách hàng.</Muted>
        ) : (
          r.customers.map((c) => (
            <View key={c.id} testID={`report-customer-${c.id}`} style={{ gap: 2, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
              <Row>
                <Body style={{ fontWeight: "600" }}>{c.name}</Body>
                {c.isNew && <Badge label="Khách mới" tone="success" />}
              </Row>
              <Muted>
                {c.phone} · {c.district ?? "—"}
              </Muted>
              <Muted>
                Đơn giao tháng này {c.monthOrders} · Doanh số tháng này {formatVnd(c.monthSales)}
              </Muted>
              <Muted>
                Tổng số đơn {c.lifetimeOrders} · Đơn gần nhất {c.last ?? "—"}
              </Muted>
            </View>
          ))
        )}
      </Card>
    </>
  );
}
