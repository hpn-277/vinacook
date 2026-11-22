import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Body, Button, Screen, Title, colors } from "@/components/ui";
import { MOBILE_HOME } from "@/lib/roles";
import { signOut, useSession } from "@/lib/session";

/** Sends each staff member to their role's home, like the web app's ROLE_HOME. */
export default function Index() {
  const { session, ready } = useSession();
  if (!ready)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  if (!session) return <Redirect href="/login" />;
  const home = MOBILE_HOME[session.staff.role];
  if (home) return <Redirect href={home} />;
  return (
    <Screen safeTop>
      <Title>Ứng dụng chưa hỗ trợ vai trò này</Title>
      <Body>Tài khoản quản lý và kế toán dùng trang web.</Body>
      <Button label="Đăng xuất" variant="outline" onPress={signOut} />
    </Screen>
  );
}
