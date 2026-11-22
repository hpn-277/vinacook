import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";
import { formatKg } from "@noodle/core/domain/money";
import { Body, Button, Card, colors, Heading, Loaded, Muted, Row, Screen, Title } from "@/components/ui";
import { api, json } from "@/lib/api";

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export default function FactoryOverview() {
  // undefined = the server's current month, so the screen agrees with the web on "this month".
  const [month, setMonth] = useState<string>();
  const query = useQuery({
    queryKey: ["factory", "month", month],
    queryFn: () => json(api.factory.month.$get({ query: month ? { month } : {} })),
    placeholderData: keepPreviousData,
  });
  const shown = query.data?.month;

  return (
    <Screen refreshing={query.isRefetching} onRefresh={query.refetch} testID="factory-overview">
      <Title>Sản lượng tháng {shown ?? ""}</Title>
      <Row>
        <Button label="‹" size="sm" variant="outline" accessibilityLabel="Tháng trước" testID="month-prev" disabled={!shown} onPress={() => shown && setMonth(shiftMonth(shown, -1))} />
        <Body testID="month-label" style={{ minWidth: 80, textAlign: "center", fontWeight: "600" }}>
          {shown ?? "…"}
        </Body>
        <Button label="›" size="sm" variant="outline" accessibilityLabel="Tháng sau" testID="month-next" disabled={!shown} onPress={() => shown && setMonth(shiftMonth(shown, 1))} />
      </Row>
      <Loaded query={query}>
        {(m) => (
          <>
            <Tile testID="factory-produced" label="Đã sản xuất" value={formatKg(m.producedKg)} note={`${m.producedCount} mặt hàng đã giao cho công ty`} />
            <Tile testID="factory-in-progress" label="Đang sản xuất" value={formatKg(m.inProgressKg)} note={m.inProgressKg ? "Chờ quản lý nhận hàng" : "Không có"} />
            <Tile testID="factory-day-count" label="Số ngày có đơn" value={String(m.days.length)} note={`Tháng ${m.month}`} />

            <Card>
              <Heading>Theo sản phẩm</Heading>
              {m.products.length === 0 ? (
                <Muted>Chưa có sản lượng trong tháng.</Muted>
              ) : (
                <>
                  {m.products.map((p) => (
                    <Row key={p.name} style={{ justifyContent: "space-between" }}>
                      <Body style={{ flex: 1, fontWeight: "500" }}>{p.name}</Body>
                      <Body>{formatKg(p.kg)}</Body>
                      <Muted style={{ minWidth: 40, textAlign: "right" }}>{Math.round((p.kg / m.producedKg) * 100)}%</Muted>
                    </Row>
                  ))}
                  <Row style={{ justifyContent: "space-between", borderTopWidth: 1, borderColor: colors.border, paddingTop: 8 }}>
                    <Body style={{ fontWeight: "600" }}>Tổng</Body>
                    <Body style={{ fontWeight: "600" }}>{formatKg(m.producedKg)}</Body>
                  </Row>
                </>
              )}
            </Card>

            <Card>
              <Heading>Theo ngày</Heading>
              {m.days.length === 0 ? (
                <Muted>Không có đơn trong tháng.</Muted>
              ) : (
                m.days.map((d) => (
                  <Row key={d.date} style={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                    <View testID={`overview-day-${d.date}`} style={{ flex: 1, gap: 2 }}>
                      <Body>
                        {d.date.slice(8)}/{d.date.slice(5, 7)}
                      </Body>
                      {d.pending && <Text style={{ fontSize: 12, color: colors.primary }}>Đang sản xuất</Text>}
                      <Muted>{d.jobs.map((j) => `${j.product} ${formatKg(j.kg)}`).join(", ")}</Muted>
                    </View>
                    <Body style={{ fontWeight: "600" }}>{formatKg(d.kg)}</Body>
                  </Row>
                ))
              )}
            </Card>
          </>
        )}
      </Loaded>
    </Screen>
  );
}

function Tile({ label, value, note, testID }: { label: string; value: string; note: string; testID: string }) {
  return (
    <Card>
      <Muted>{label}</Muted>
      <Text testID={testID} style={{ fontSize: 24, fontWeight: "700", color: colors.foreground }}>
        {value}
      </Text>
      <Muted style={{ fontSize: 12 }}>{note}</Muted>
    </Card>
  );
}
