import { Link } from "expo-router";
import { useState } from "react";
import { Button, Card, Field, Muted, Notice, Screen, Title, colors } from "@/components/ui";
import { api } from "@/lib/api";
import { useAction } from "@/lib/mutation";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const reset = useAction(() => api.auth["forgot-password"].$post({ json: { email: email.trim() } }));
  return (
    <Screen safeTop>
      <Title>Quên mật khẩu</Title>
      <Card>
        <Muted>Nhập email đăng nhập, hệ thống sẽ gửi link đặt lại mật khẩu.</Muted>
        <Field label="Email" testID="reset-email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Button label="Gửi link đặt lại mật khẩu" testID="reset-submit" onPress={() => reset.run()} pending={reset.pending} />
        <Notice result={reset.result} />
        <Link href="/login" style={{ color: colors.primary, textAlign: "center", paddingVertical: 8 }}>
          Quay lại đăng nhập
        </Link>
      </Card>
    </Screen>
  );
}
