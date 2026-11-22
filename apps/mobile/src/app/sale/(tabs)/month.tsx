import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { formatKg, formatVnd } from "@noodle/core/domain/money";
import { MonthReport } from "@/components/sale/MonthReport";
import { Body, Button, Card, Heading, Loaded, Muted, Row, Screen, Title, colors } from "@/components/ui";
import { api, json } from "@/lib/api";

const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
};

/** The web /sale/month: orders per production day (tap to open that day), then commission. */
export default function SaleMonth() {
  const [month, setMonth] = useState<string | undefined>();
  const q = useQuery({ queryKey: ["sale", "month", month], queryFn: () => json(api.sale.month.$get({ query: { month } })) });
  return (
    <Screen testID="sale-month" refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Loaded query={q}>
        {(d) => (
          <>
            <Title>Tổng quan tháng {d.month}</Title>
            <Row>
              <Button label="‹ Tháng trước" variant="outline" size="sm" testID="month-prev" onPress={() => setMonth(shiftMonth(d.month, -1))} />
              <Text testID="month-label" style={{ fontWeight: "600", color: colors.foreground }}>
                {d.month}
              </Text>
              <Button label="Tháng sau ›" variant="outline" size="sm" testID="month-next" onPress={() => setMonth(shiftMonth(d.month, 1))} />
            </Row>
            <Card testID="month-days">
              <Heading>Đơn theo ngày</Heading>
              <Muted>Tính theo ngày sản xuất. Chạm vào một ngày để xem đơn.</Muted>
              {d.days.length === 0 ? (
                <Muted>Chưa có đơn trong tháng này.</Muted>
              ) : (
                d.days.map((day) => (
                  <Pressable
                    key={day.day}
                    testID={`month-day-${day.day}`}
                    accessibilityRole="link"
                    onPress={() => router.navigate({ pathname: "/sale", params: { date: day.day } })}
                    style={({ pressed }) => ({ gap: 2, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, opacity: pressed ? 0.6 : 1 })}
                  >
                    <Row style={{ justifyContent: "space-between" }}>
                      <Body style={{ fontWeight: "700", color: colors.primary }}>{day.day}</Body>
                      <Body style={{ fontWeight: "600" }}>{formatVnd(day.revenue)}</Body>
                    </Row>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Muted>
                        {day.orders} đơn{day.cancelled ? ` (+${day.cancelled} hủy)` : ""} · {formatKg(day.kg)}
                      </Muted>
                      {day.unpaid > 0 && <Muted style={{ color: colors.destructive }}>Chưa thu {formatVnd(day.unpaid)}</Muted>}
                    </View>
                  </Pressable>
                ))
              )}
            </Card>
            <Heading>Hoa hồng tháng {d.month}</Heading>
            <MonthReport report={d.report} />
          </>
        )}
      </Loaded>
    </Screen>
  );
}
