import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { itemLabel } from "@noodle/core/domain/catalog";
import { dialable, formatDestination } from "@noodle/core/domain/destination";
import { formatVnd } from "@noodle/core/domain/money";
import type { SaleOrder } from "@noodle/core/queries/sale";
import { Body, Button, Field, Muted, Notice, Row, colors } from "@/components/ui";
import { api } from "@/lib/api";
import { useAction } from "@/lib/mutation";

/** The web /sale "Đơn cần duyệt" row: call the customer, then Duyệt or Không hợp lệ (with a reason, which cancels the order). */
export function ReviewCard({ order: o }: { order: SaleOrder }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const review = useAction((json: { decision: "approved" } | { decision: "rejected"; note: string }) =>
    api.reviews[":id"].$post({ param: { id: String(o.id) }, json }),
  );
  return (
    <View testID={`review-${o.code}`} style={{ gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Body style={{ fontWeight: "700", color: colors.primary }}>{o.code}</Body>
        <Body style={{ fontWeight: "600" }}>{formatVnd(o.total)}</Body>
      </Row>
      <Body>
        {o.customers?.name}{" "}
        <Text style={{ color: colors.primary }} onPress={() => Linking.openURL(`tel:${dialable(o.phone, o.country)}`)}>
          {o.phone}
        </Text>
      </Body>
      <Muted>
        Ngày SX {o.production_date} · {formatDestination(o)}
      </Muted>
      <Muted>{o.order_items.map(itemLabel).join(", ")}</Muted>
      {o.note ? <Muted>Ghi chú: {o.note}</Muted> : null}
      {rejecting ? (
        <View style={{ gap: 6 }}>
          <Field label="Lý do không hợp lệ" testID={`review-note-${o.code}`} value={note} onChangeText={setNote} />
          <Row>
            <Button label="Quay lại" variant="outline" size="sm" onPress={() => setRejecting(false)} />
            <Button
              label="Xác nhận không hợp lệ"
              size="sm"
              testID={`review-reject-confirm-${o.code}`}
              disabled={!note.trim()}
              pending={review.pending}
              onPress={() => review.run({ decision: "rejected", note })}
            />
          </Row>
        </View>
      ) : (
        <Row>
          <Button label="Duyệt" size="sm" testID={`review-approve-${o.code}`} pending={review.pending} onPress={() => review.run({ decision: "approved" })} />
          <Button label="Không hợp lệ" variant="outline" size="sm" testID={`review-reject-${o.code}`} onPress={() => setRejecting(true)} />
        </Row>
      )}
      <Notice result={review.result} />
    </View>
  );
}
