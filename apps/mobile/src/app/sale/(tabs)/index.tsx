import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { itemLabel } from "@noodle/core/domain/catalog";
import { formatVnd } from "@noodle/core/domain/money";
import { MonthReport } from "@/components/sale/MonthReport";
import { OrderBadge, TierBadge } from "@/components/status";
import { Body, Button, Card, Heading, Loaded, Muted, Row, Screen, Title, colors } from "@/components/ui";
import { api, json } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { useSession } from "@/lib/session";

const departedAt = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
};

export default function SaleDashboard() {
  const { session } = useSession();
  const [month, setMonth] = useState<string | undefined>();
  const q = useQuery({ queryKey: ["sale", "dashboard", month], queryFn: () => json(api.sale.dashboard.$get({ query: { month } })) });
  return (
    <Screen testID="sale-dashboard" refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Title>Xin chào {session?.staff.name}</Title>
      <Card>
        <Muted>Link giới thiệu (khách đặt qua link sẽ thuộc về bạn)</Muted>
        <Text selectable testID="ref-link" style={{ fontFamily: "monospace", color: colors.foreground }}>
          {`${API_URL}/r/${session?.staff.ref_code}`}
        </Text>
        <Button label="Tạo đơn" testID="dashboard-new-order" onPress={() => router.navigate("/sale/new")} />
      </Card>
      <Loaded query={q}>
        {(d) => (
          <>
            <Card testID="active-orders">
              <Heading>Đơn đang xử lý ({d.active.length})</Heading>
              {d.active.length === 0 ? (
                <Muted>Không có đơn đang xử lý.</Muted>
              ) : (
                d.active.map((o) => (
                  <Pressable
                    key={o.id}
                    testID={`order-${o.code}`}
                    accessibilityRole="link"
                    accessibilityLabel={o.code}
                    onPress={() => router.push(`/sale/orders/${o.code}`)}
                    style={({ pressed }) => ({ gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, opacity: pressed ? 0.6 : 1 })}
                  >
                    <Row style={{ justifyContent: "space-between" }}>
                      <Body style={{ fontWeight: "700", color: colors.primary }}>{o.code}</Body>
                      <Row>
                        <Body>{formatVnd(o.total)}</Body>
                        <TierBadge tier={o.price_tier} />
                      </Row>
                    </Row>
                    <Muted>Ngày SX {o.production_date}</Muted>
                    <Body>
                      {o.customers?.name} <Muted>{o.customers?.phone}</Muted>
                    </Body>
                    <Muted>{o.order_items.map(itemLabel).join(", ")}</Muted>
                    <Row style={{ flexWrap: "wrap" }}>
                      <OrderBadge status={o.status} />
                      <Muted>
                        {o.driver ? `${o.driver.name}${o.driver.phone ? ` · ${o.driver.phone}` : ""}` : "Chưa có tài xế"}
                        {o.driver && o.departed_at ? ` · Đã rời kho · ${departedAt.format(new Date(o.departed_at))}` : ""}
                      </Muted>
                    </Row>
                  </Pressable>
                ))
              )}
            </Card>

            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>Hoa hồng tháng {d.month}</Text>
              <Row>
                <Button label="‹ Tháng trước" variant="outline" size="sm" testID="month-prev" onPress={() => setMonth(shiftMonth(d.month, -1))} />
                <Text testID="month-label" accessibilityLabel="Chọn tháng" style={{ fontWeight: "600", color: colors.foreground }}>
                  {d.month}
                </Text>
                <Button label="Tháng sau ›" variant="outline" size="sm" testID="month-next" onPress={() => setMonth(shiftMonth(d.month, 1))} />
              </Row>
            </View>
            <MonthReport report={d.report} />
          </>
        )}
      </Loaded>
    </Screen>
  );
}
