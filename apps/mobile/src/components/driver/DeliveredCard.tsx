import { useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { collectLabel } from "@noodle/core/domain/delivery";
import type { DriverOrder } from "@noodle/core/queries/driver";
import { fileUri } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Body, Card, colors, Muted, Row } from "@/components/ui";

const clock = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });

export function DeliveredCard({ order: o }: { order: DriverOrder }) {
  const token = useSession().session?.access_token;
  const [zoom, setZoom] = useState(false);
  const source = o.photo ? { uri: fileUri(o.photo), headers: { Authorization: `Bearer ${token}` } } : null;
  return (
    <Card testID={`delivered-${o.code}`} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      {source ? (
        <Pressable testID={`delivered-photo-${o.code}`} accessibilityRole="imagebutton" accessibilityLabel={`Ảnh giao ${o.code}`} onPress={() => setZoom(true)}>
          <Image source={source} style={{ width: 64, height: 64, borderRadius: 6 }} />
        </Pressable>
      ) : (
        <View style={{ width: 64, height: 64, borderRadius: 6, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }}>
          <Muted style={{ fontSize: 11, textAlign: "center" }}>Không ảnh</Muted>
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>{o.code}</Text>
          <Muted>{clock.format(new Date(o.delivered_at!))}</Muted>
        </Row>
        <Text numberOfLines={1} style={{ fontSize: 15, color: colors.foreground }}>
          {o.customers?.name}
        </Text>
        <Body style={{ color: o.payment_status === "paid" ? colors.success : colors.mutedForeground }}>{collectLabel(o)}</Body>
      </View>
      {source && (
        <Modal visible={zoom} transparent onRequestClose={() => setZoom(false)}>
          <Pressable accessibilityLabel="Đóng" onPress={() => setZoom(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center" }}>
            <Image source={source} accessibilityLabel={`Ảnh giao ${o.code}`} style={{ width: "100%", height: "80%" }} resizeMode="contain" />
          </Pressable>
        </Modal>
      )}
    </Card>
  );
}
