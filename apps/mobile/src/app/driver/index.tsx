import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { collectLabel } from "@noodle/core/domain/delivery";
import { formatKg } from "@noodle/core/domain/money";
import { ORDER_STATUS_LABEL } from "@noodle/core/domain/status";
import { CompleteDelivery } from "@/components/driver/CompleteDelivery";
import { DeliveredCard } from "@/components/driver/DeliveredCard";
import { OrderCard } from "@/components/driver/OrderCard";
import { ReasonAction } from "@/components/driver/ReasonAction";
import { Body, Button, Card, colors, ConfirmButton, Heading, Loaded, Muted, Notice, Row, Screen, Title } from "@/components/ui";
import { api, json } from "@/lib/api";
import { useAction } from "@/lib/mutation";

const longDate = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
const depart = (ids: number[]) => api.driver.orders.depart.$post({ json: { order_ids: ids } });

export default function DriverHome() {
  const query = useQuery({ queryKey: ["driver", "orders"], queryFn: () => json(api.driver.orders.$get()) });
  // Lives at screen level so "Đã xác nhận N đơn lên xe" stays visible after the button disappears.
  const departAll = useAction(depart);
  const date = longDate.format(new Date());
  return (
    <Screen testID="driver-home" refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <View>
        <Title>Đơn giao của tôi</Title>
        <Muted>{date.charAt(0).toUpperCase() + date.slice(1)}</Muted>
      </View>
      <Loaded query={query}>
        {({ waiting, onTheRoad, delivered, toLoad, kg }) => (
          <>
            <View testID="driver-counts" style={{ flexDirection: "row", gap: 8 }}>
              <Count testID="count-assigned" label={ORDER_STATUS_LABEL.assigned} value={waiting.length} kg={kg.waiting} />
              <Count testID="count-out-for-delivery" label={ORDER_STATUS_LABEL.out_for_delivery} value={onTheRoad.length} kg={kg.onTheRoad} />
              <Count testID="count-delivered" label="Đã giao hôm nay" value={delivered.length} />
            </View>

            {toLoad.length > 0 && (
              <Card testID="load-list">
                <Row style={{ justifyContent: "space-between" }}>
                  <Heading>Hàng cần lên xe</Heading>
                  <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>Tổng {formatKg(kg.waiting)}</Text>
                </Row>
                {toLoad.map((l) => (
                  <Row key={l.product} style={{ justifyContent: "space-between", alignItems: "flex-start", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontWeight: "500" }}>{l.product}</Body>
                      <Muted>{l.packs.join(" · ")}</Muted>
                    </View>
                    <Body style={{ fontWeight: "500" }}>{formatKg(l.kg)}</Body>
                  </Row>
                ))}
              </Card>
            )}

            {waiting.length > 0 && (
              <ConfirmButton
                size="lg"
                label={`XÁC NHẬN HÀNG ĐÃ LÊN XE (${waiting.length} đơn)`}
                testID="depart-all"
                confirm={`Xác nhận ${waiting.length} đơn đã lên xe và rời kho?`}
                pending={departAll.pending}
                onPress={() => departAll.run(waiting.map((o) => o.id))}
              />
            )}
            <Notice result={departAll.result} />

            <Section testID="section-assigned" title={ORDER_STATUS_LABEL.assigned} count={waiting.length} empty="Không có đơn chờ lên xe.">
              {waiting.map((o) => (
                <OrderCard key={o.id} order={o}>
                  <DepartOne orderId={o.id} code={o.code} />
                  <ReasonAction kind="return" orderId={o.id} code={o.code} />
                </OrderCard>
              ))}
            </Section>

            <Section testID="section-out-for-delivery" title={ORDER_STATUS_LABEL.out_for_delivery} count={onTheRoad.length} empty="Không có đơn đang giao.">
              {onTheRoad.map((o) => (
                <OrderCard key={o.id} order={o}>
                  <CompleteDelivery orderId={o.id} code={o.code} collect={collectLabel(o)} />
                  <ReasonAction kind="fail" orderId={o.id} code={o.code} />
                </OrderCard>
              ))}
            </Section>

            <Section testID="section-delivered" title="Đã giao hôm nay" count={delivered.length} empty="Chưa giao đơn nào hôm nay.">
              {delivered.map((o) => (
                <DeliveredCard key={o.id} order={o} />
              ))}
            </Section>
          </>
        )}
      </Loaded>
    </Screen>
  );
}

function DepartOne({ orderId, code }: { orderId: number; code: string }) {
  const action = useAction(() => depart([orderId]));
  return (
    <>
      <Button variant="outline" label="Lên xe" testID={`depart-${code}`} pending={action.pending} onPress={() => action.run()} />
      <Notice result={action.result} />
    </>
  );
}

function Count({ label, value, kg, testID }: { label: string; value: number; kg?: number; testID: string }) {
  return (
    <View testID={testID} style={{ flex: 1, alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.card, paddingVertical: 8, paddingHorizontal: 4 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", color: colors.foreground }}>{value}</Text>
      <Muted style={{ fontSize: 12, textAlign: "center" }}>{label}</Muted>
      {kg !== undefined && <Text style={{ fontSize: 12, fontWeight: "500", color: colors.foreground }}>{formatKg(kg)}</Text>}
    </View>
  );
}

function Section({ title, count, empty, children, testID }: { title: string; count: number; empty: string; children: ReactNode; testID: string }) {
  return (
    <View testID={testID} style={{ gap: 12, marginTop: 8 }}>
      <Heading>
        {title} ({count})
      </Heading>
      {count === 0 ? <Muted>{empty}</Muted> : children}
    </View>
  );
}
