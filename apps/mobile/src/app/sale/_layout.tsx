import { Stack } from "expo-router";
import { colors } from "@/components/ui";

/** The tabs, with an order's detail pushed on top (native tabs cannot hold a hidden route). */
export default function SaleLayout() {
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="orders/[code]" options={{ title: "Đơn hàng", headerBackTitle: "Tổng quan" }} />
    </Stack>
  );
}
