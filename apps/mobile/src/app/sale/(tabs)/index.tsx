import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text } from "react-native";
import { itemLabel } from "@noodle/core/domain/catalog";
import { formatVnd } from "@noodle/core/domain/money";
import { ReviewCard } from "@/components/sale/ReviewCard";
import { OrderBadge } from "@/components/status";
import { Body, Button, Card, Heading, Loaded, Muted, Row, Screen, Title, colors } from "@/components/ui";
import { api, json } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { useSession } from "@/lib/session";

const departedAt = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

const shiftDay = (date: string, by: number) => new Date(Date.parse(`${date}T00:00:00Z`) + by * 86_400_000).toISOString().slice(0, 10);


export default function SaleDashboard() {
  const { session } = useSession();
  // ?date= so the month tab can open a day.
  const { date } = useLocalSearchParams<{ date?: string }>();
  const setDate = (d: string) => router.setParams({ date: d });
  const q = useQuery({ queryKey: ["sale", "dashboard", date], queryFn: () => json(api.sale.dashboard.$get({ query: { date } })) });
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
  return (
    <Screen testID="sale-dashboard" refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Title>Xin chào {session?.staff.name}</Title>
      <Loaded query={q}>
        {(d) => (
          <>
            <Card testID="day-orders">
              <Heading>
                {d.date === today ? "Đơn hàng hôm nay" : `Đơn hàng ngày ${d.date}`} ({d.day.filter((o) => o.status !== "cancelled").length})
              </Heading>
              <Row>
                <Button label="‹ Ngày trước" variant="outline" size="sm" testID="day-prev" onPress={() => setDate(shiftDay(d.date, -1))} />
                <Text testID="day-label" style={{ fontWeight: "600", color: colors.foreground }}>
                  {d.date}
                </Text>
                <Button label="Ngày sau ›" variant="outline" size="sm" testID="day-next" onPress={() => setDate(shiftDay(d.date, 1))} />
              </Row>
              <Muted>Tổng {formatVnd(d.day.filter((o) => o.status !== "cancelled").reduce((t, o) => t + o.total, 0))}</Muted>
              <Button label="Tạo đơn" testID="dashboard-new-order" onPress={() => router.navigate("/sale/new")} />
              {d.day.length === 0 ? (
                <Muted>Chưa có đơn nào.</Muted>
              ) : (
                d.day.map((o) => (
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
                      <Body>{formatVnd(o.total)}</Body>
                    </Row>
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

            {d.toReview.length > 0 && (
              <Card testID="to-review" style={{ borderColor: colors.warning, borderWidth: 2 }}>
                <Heading>Đơn cần duyệt ({d.toReview.length})</Heading>
                <Muted>Khách đặt qua link của bạn. Gọi khách kiểm tra rồi duyệt; đơn chưa duyệt sẽ không được gửi xưởng.</Muted>
                {d.toReview.map((o) => (
                  <ReviewCard key={o.id} order={o} />
                ))}
              </Card>
            )}

            <Card>
              <Muted>Link giới thiệu (khách đặt qua link sẽ thuộc về bạn)</Muted>
              <Text selectable testID="ref-link" style={{ fontFamily: "monospace", color: colors.foreground }}>
                {`${API_URL}/r/${session?.staff.ref_code}`}
              </Text>
            </Card>
          </>
        )}
      </Loaded>
    </Screen>
  );
}
