import { useState } from "react";
import { TextInput, View } from "react-native";
import { api } from "@/lib/api";
import { useAction } from "@/lib/mutation";
import { Button, colors, ConfirmButton, Notice, styles } from "@/components/ui";

const KIND = {
  return: { placeholder: "Lý do trả đơn", label: "Trả đơn", variant: "outline" as const, call: (id: string, reason: string) => api.driver.orders[":id"].return.$post({ param: { id }, json: { reason } }) },
  fail: { placeholder: "Lý do thất bại", label: "Thất bại", variant: "destructive" as const, call: (id: string, reason: string) => api.driver.orders[":id"].fail.$post({ param: { id }, json: { reason } }) },
};

/** "Trả đơn" (behind a confirm) or "Thất bại": a required reason, then the write. */
export function ReasonAction({ kind, orderId, code }: { kind: keyof typeof KIND; orderId: number; code: string }) {
  const k = KIND[kind];
  const [reason, setReason] = useState("");
  const action = useAction(() => k.call(String(orderId), reason));
  const props = {
    label: k.label,
    variant: k.variant,
    testID: `${kind}-${code}`,
    disabled: !reason.trim(),
    pending: action.pending,
    onPress: () => action.run(),
  };
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          testID={`${kind}-reason-${code}`}
          accessibilityLabel={`${k.placeholder} ${code}`}
          placeholder={k.placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={reason}
          onChangeText={setReason}
          style={[styles.input, { flex: 1 }]}
        />
        {kind === "return" ? <ConfirmButton {...props} confirm={`Trả đơn ${code} cho quản lý?`} /> : <Button {...props} />}
      </View>
      <Notice result={action.result} />
    </View>
  );
}
