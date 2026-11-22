import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** The web app's theme tokens (apps/web/app/globals.css), as hex. */
export const colors = {
  background: "#FAF8F4",
  foreground: "#1C1917",
  card: "#FFFFFF",
  primary: "#F54A00",
  primaryForeground: "#FFFFFF",
  muted: "#F5F5F5",
  mutedForeground: "#737373",
  border: "#E5E5E5",
  destructive: "#E7000B",
  success: "#15803D",
  successBg: "#F0FDF4",
  warning: "#B45309",
  warningBg: "#FFFBEB",
};

/** `safeTop` for screens with no navigation header above them (login), so content clears the status bar. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  testID,
  safeTop,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  testID?: string;
  safeTop?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      testID={testID}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.screen, safeTop && { paddingTop: insets.top + 16 }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

/** Spinner or error for a screen's query; renders children once data is there. */
export function Loaded<T>({ query, children }: { query: { data: T | undefined; error: Error | null; isPending: boolean }; children: (data: T) => ReactNode }) {
  if (query.error) return <Notice result={{ ok: false, text: query.error.message }} />;
  if (query.isPending || query.data === undefined) return <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />;
  return <>{children(query.data)}</>;
}

export function Card({ children, style, testID }: { children: ReactNode; style?: ViewStyle; testID?: string }) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Body({ children, style, testID }: { children: ReactNode; style?: object; testID?: string }) {
  return (
    <Text testID={testID} style={[styles.body, style]}>
      {children}
    </Text>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "default" | "outline" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  pending?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

export function Button({ label, onPress, variant = "default", size = "md", disabled, pending, testID, accessibilityLabel }: ButtonProps) {
  const fill = variant === "default" ? colors.primary : variant === "destructive" ? colors.destructive : "transparent";
  const text = variant === "default" || variant === "destructive" ? colors.primaryForeground : variant === "ghost" ? colors.mutedForeground : colors.foreground;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || pending }}
      disabled={disabled || pending}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: fill, minHeight: size === "lg" ? 52 : size === "sm" ? 34 : 44, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        variant === "outline" && { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      {pending ? <ActivityIndicator color={text} /> : <Text style={[styles.buttonText, { color: text, fontSize: size === "sm" ? 13 : 15 }]}>{label}</Text>}
    </Pressable>
  );
}

/** A button behind a native confirm dialog, like ActionForm's `confirm` on the web. */
export function ConfirmButton({ confirm, ...props }: ButtonProps & { confirm: string }) {
  return (
    <Button
      {...props}
      onPress={() =>
        Alert.alert(confirm, undefined, [
          { text: "Quay lại", style: "cancel" },
          { text: "Xác nhận", onPress: props.onPress },
        ])
      }
    />
  );
}

export function Field({ label, testID, ...input }: TextInputProps & { label: string; testID?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput testID={testID} accessibilityLabel={label} placeholderTextColor={colors.mutedForeground} style={styles.input} {...input} />
    </View>
  );
}

/** Inline result of a write: the API's success message or its error. */
export function Notice({ result }: { result: { ok: boolean; text: string } | null }) {
  if (!result) return null;
  return (
    <View
      accessibilityRole={result.ok ? "summary" : "alert"}
      testID={result.ok ? "notice-success" : "notice-error"}
      style={[styles.notice, result.ok ? { backgroundColor: colors.successBg, borderColor: "#BBF7D0" } : { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}
    >
      <Text style={{ color: result.ok ? colors.success : colors.destructive }}>{result.text}</Text>
    </View>
  );
}

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "primary" | "success" | "warning" | "danger" }) {
  const palette = {
    neutral: [colors.muted, colors.foreground],
    primary: ["#FFF7ED", colors.primary],
    success: [colors.successBg, colors.success],
    warning: [colors.warningBg, colors.warning],
    danger: ["#FEF2F2", colors.destructive],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette[0] }]}>
      <Text style={{ color: palette[1], fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, paddingBottom: 48 },
  card: { backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  heading: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  muted: { fontSize: 13, color: colors.mutedForeground },
  body: { fontSize: 15, color: colors.foreground },
  label: { fontSize: 14, fontWeight: "500", color: colors.foreground },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, backgroundColor: colors.card, fontSize: 16, color: colors.foreground },
  button: { borderRadius: 8, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  buttonText: { fontWeight: "600" },
  notice: { borderWidth: 1, borderRadius: 8, padding: 10 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
});
