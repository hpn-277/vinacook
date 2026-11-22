import { formatDestination } from "@noodle/core/domain/destination";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { lineLabel } from "@noodle/core/domain/catalog";
import { formatKg, formatVnd } from "@noodle/core/domain/money";
import { OrderBadge } from "@/components/status";
import { Body, Card, Heading, Loaded, Muted, Row, Screen, colors } from "@/components/ui";
import { api, fileUri, json } from "@/lib/api";
import { accessToken } from "@/lib/session";

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, paddingVertical: 2 }}>
      <Text style={{ width: 120, color: colors.mutedForeground }}>{label}</Text>
      <View style={{ flex: 1 }}>{typeof children === "string" ? <Body>{children}</Body> : children}</View>
    </View>
  );
}

const Tel = ({ phone }: { phone: string }) => (
  <Text accessibilityRole="link" style={{ color: colors.primary, fontSize: 15 }} onPress={() => Linking.openURL(`tel:${phone}`)}>
    {phone}
  </Text>
);

/** Delivery photos are staff-only, so the image request carries the Bearer token. */
function DeliveryPhoto({ path, code }: { path: string; code: string }) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    accessToken().then(setToken);
  }, []);
  if (!token) return null;
  return (
    <Image
      testID="delivery-photo"
      accessibilityLabel={`Ảnh giao hàng ${code}`}
      source={{ uri: fileUri(path), headers: { authorization: `Bearer ${token}` } }}
      style={{ width: "100%", height: 220, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
      resizeMode="contain"
    />
  );
}

/** Read-only order page for the sale it is credited to (web OrderDetail with viewer `sale`). */
export default function SaleOrderDetail() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const q = useQuery({ queryKey: ["sale", "order", code], queryFn: () => json(api.sale.orders[":code"].$get({ param: { code } })) });
  return (
    <Screen testID={`order-detail-${code}`} refreshing={q.isRefetching} onRefresh={q.refetch}>
      <Pressable accessibilityRole="link" testID="back-dashboard" onPress={() => router.navigate("/sale")}>
        <Muted>‹ Tổng quan</Muted>
      </Pressable>
      <Loaded query={q}>
        {({ order, creatorLabel, customerSince, photo, kg, commission, timeline, history }) => {
          const owner = order.customer?.owner;
          return (
            <>
              <View style={{ gap: 6 }}>
                <Row style={{ flexWrap: "wrap" }}>
                  <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>{order.code}</Text>
                  <OrderBadge status={order.status} />
                </Row>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text testID="payment-status" style={{ color: order.payment_status === "paid" ? colors.success : colors.mutedForeground }}>
                    {order.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                  </Text>
                  <Text testID="order-total" style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>
                    {formatVnd(order.total)}
                  </Text>
                </Row>
              </View>

              <Card>
                <Heading>Khách hàng & giao hàng</Heading>
                <Line label="Khách hàng">{order.customer?.name ?? ""}</Line>
                <Line label="Số điện thoại">
                  <Tel phone={order.phone} />
                </Line>
                <Line label="Địa chỉ giao">{formatDestination(order)}</Line>
                {order.note && <Line label="Ghi chú">{order.note}</Line>}
                <Line label="Khách từ">{customerSince ?? "—"}</Line>
                <Line label="Tài xế">
                  {order.driver ? (
                    <Body>
                      {order.driver.name}
                      {order.driver_contact?.phone && (
                        <>
                          {" · "}
                          <Tel phone={order.driver_contact.phone} />
                        </>
                      )}
                    </Body>
                  ) : (
                    "—"
                  )}
                </Line>
                {photo && (
                  <Line label="Ảnh giao hàng">
                    <DeliveryPhoto path={photo} code={order.code} />
                  </Line>
                )}
                {order.fail_reason && (
                  <Line label="Lý do thất bại">
                    <Body style={{ color: colors.destructive }}>{order.fail_reason}</Body>
                  </Line>
                )}
                {order.status === "ready" && order.return_reason && (
                  <Line label="Tài xế trả đơn">
                    <Body style={{ color: colors.warning }}>
                      {order.returner?.name ?? "Tài xế"} trả: {order.return_reason}
                    </Body>
                  </Line>
                )}
              </Card>

              <Card>
                <Heading>NVKD & hoa hồng</Heading>
                <Line label="NVKD phụ trách">{owner ? `${owner.name} (${owner.ref_code})` : "Không có (khách vãng lai)"}</Line>
                <Line label="Đơn tính cho">{order.sale?.name ?? "—"}</Line>
                <Line label="Người tạo đơn">{creatorLabel}</Line>
                <Line label="% hoa hồng">{owner?.commission_pct != null ? `${owner.commission_pct}%` : "—"}</Line>
                <Line label="Hoa hồng đơn này">
                  {commission != null ? <Body testID="order-commission">{formatVnd(commission)}</Body> : <Muted>Chỉ tính khi đơn đã giao</Muted>}
                </Line>
              </Card>

              <Card>
                <Heading>Hàng hóa & giá</Heading>
                {order.items.map((i) => (
                  <View key={i.id} style={{ gap: 2, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 }}>
                    <Row style={{ justifyContent: "space-between" }}>
                      <Body style={{ flex: 1 }}>{lineLabel(i.products?.name ?? "?", i.pack_name, i.pack_qty, i.qty_kg)}</Body>
                      <Body style={{ fontWeight: "600" }}>{formatVnd(i.line_total)}</Body>
                    </Row>
                    <Muted>
                      {formatKg(i.qty_kg)} · {formatVnd(i.price_per_kg)}/kg
                    </Muted>
                  </View>
                ))}
                <Row style={{ justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 }}>
                  <Body style={{ fontWeight: "700" }}>Tổng · {formatKg(kg)}</Body>
                  <Body style={{ fontWeight: "700" }}>{formatVnd(order.total)}</Body>
                </Row>
              </Card>

              <Card>
                <Heading>Tiến trình</Heading>
                {timeline.map((t) => (
                  <View key={t.label} style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ marginTop: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: t.at || t.done ? colors.primary : colors.border }} />
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontWeight: "600" }}>
                        {t.label} {t.at && <Muted>· {t.at}</Muted>}
                      </Body>
                      {t.note ? <Muted>{t.note}</Muted> : null}
                    </View>
                  </View>
                ))}
              </Card>

              <Card>
                <Heading>Đơn khác của khách này</Heading>
                {history.map((h) => (
                  <Pressable
                    key={h.code}
                    testID={`history-${h.code}`}
                    disabled={h.code === order.code}
                    accessibilityRole="link"
                    onPress={() => router.push(`/sale/orders/${h.code}`)}
                    style={{ gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, backgroundColor: h.code === order.code ? colors.muted : undefined }}
                  >
                    <Row style={{ justifyContent: "space-between" }}>
                      <Body style={{ fontWeight: "700", color: h.code === order.code ? colors.foreground : colors.primary }}>{h.code}</Body>
                      <Body>{formatVnd(h.total)}</Body>
                    </Row>
                    <Row>
                      <Muted>{h.production_date}</Muted>
                      <OrderBadge status={h.status} />
                      <Muted>{h.payment_status === "paid" ? "Đã trả" : "Chưa trả"}</Muted>
                    </Row>
                  </Pressable>
                ))}
              </Card>
            </>
          );
        }}
      </Loaded>
    </Screen>
  );
}
