import { Redirect, Tabs } from "expo-router";
import { Pressable, Text } from "react-native";
import type { StaffRole } from "@noodle/core/staff";
import { colors } from "@/components/ui";
import { signOut, useSession } from "@/lib/session";

/** A role's bottom tabs (the web StaffShell's nav links); other roles are sent back to their own home. */
export function RoleTabs({ role, tabs }: { role: StaffRole; tabs: { name: string; title: string }[] }) {
  const { session, ready } = useSession();
  if (ready && !session) return <Redirect href="/login" />;
  if (ready && session && session.staff.role !== role) return <Redirect href="/" />;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarIcon: () => null,
        tabBarIconStyle: { display: "none" },
        tabBarLabelStyle: { fontSize: 14, fontWeight: "600" },
        headerTitleStyle: { fontWeight: "700" },
        headerRight: () => (
          <Pressable accessibilityRole="button" onPress={signOut} style={{ paddingHorizontal: 16 }}>
            <Text style={{ color: colors.mutedForeground }}>Đăng xuất</Text>
          </Pressable>
        ),
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title, tabBarAccessibilityLabel: t.title, tabBarButtonTestID: `tab-${t.name}` }} />
      ))}
    </Tabs>
  );
}
