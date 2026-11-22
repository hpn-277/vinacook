import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { Button, Card, Field, Notice, Screen, Title, colors } from "@/components/ui";
import { signIn, useSession } from "@/lib/session";

export default function Login() {
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (session) return <Redirect href="/" />;

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Screen safeTop>
      <Title>Đăng nhập nhân viên</Title>
      <Card>
        <Field label="Email" testID="login-email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="username" keyboardType="email-address" />
        <Field label="Mật khẩu" testID="login-password" value={password} onChangeText={setPassword} secureTextEntry={!shown} autoComplete="current-password" onSubmitEditing={submit} />
        <Button label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"} variant="ghost" size="sm" onPress={() => setShown(!shown)} />
        <Button label="Đăng nhập" size="lg" testID="login-submit" onPress={submit} pending={pending} />
        <Notice result={error ? { ok: false, text: error } : null} />
        <Link href="/forgot-password" style={{ color: colors.primary, textAlign: "center", paddingVertical: 8 }}>
          Quên mật khẩu?
        </Link>
      </Card>
    </Screen>
  );
}
