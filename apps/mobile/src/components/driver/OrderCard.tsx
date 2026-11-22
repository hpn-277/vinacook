import type { ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { itemLabel } from "@noodle/core/domain/catalog";
import { collectLabel } from "@noodle/core/domain/delivery";
import { formatKg } from "@noodle/core/domain/money";
import type { DriverOrder } from "@noodle/core/queries/driver";
import { Body, Button, Card, colors, Muted, Row } from "@/components/ui";

export function OrderCard({ order: o, children }: { order: DriverOrder; children: ReactNode }) {
  const destination = `${o.address}, ${o.district}, TP. Hồ Chí Minh`;
  return (
    <Card testID={`order-${o.code}`}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>{o.code}</Text>
        <Text testID={`collect-${o.code}`} style={{ fontWeight: "700", color: o.payment_status === "paid" ? colors.success : colors.primary }}>
          {collectLabel(o)}
        </Text>
      </Row>
      <Body style={{ fontWeight: "500", fontSize: 16 }}>{o.customers?.name}</Body>
      <Body>
        {o.address}, <Text style={{ fontWeight: "700" }}>{o.district}</Text>
      </Body>
      {o.note && <Muted>Ghi chú: {o.note}</Muted>}
      <Muted>
        {o.order_items.map(itemLabel).join(", ")} · <Text style={{ fontWeight: "500", color: colors.foreground }}>Tổng {formatKg(o.kg)}</Text>
      </Muted>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button variant="outline" label={`Gọi ${o.phone}`} testID={`call-${o.code}`} onPress={() => Linking.openURL(`tel:${o.phone}`)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            variant="outline"
            label="Chỉ đường"
            testID={`directions-${o.code}`}
            onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`)}
          />
        </View>
      </View>
      {children}
    </Card>
  );
}
