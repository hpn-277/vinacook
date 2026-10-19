import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { authClient } from "@/lib/supabase/auth-client";
import { setPassword } from "./actions";

export default async function SetPasswordPage() {
  const { data } = await (await authClient()).auth.getClaims();
  if (!data?.claims?.email) redirect("/login?link=expired");
  return (
    <main className="mx-auto max-w-sm p-4 pt-16">
      <PageTitle>Đặt mật khẩu</PageTitle>
      <Card>
        <CardContent>
          <ActionForm action={setPassword}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="set-email">Email</FieldLabel>
                <Input id="set-email" value={String(data.claims.email)} readOnly autoComplete="username" />
              </Field>
              <Field>
                <FieldLabel htmlFor="set-password">Mật khẩu mới</FieldLabel>
                <PasswordInput id="set-password" name="password" minLength={8} required autoComplete="new-password" />
                <FieldDescription>Tối thiểu 8 ký tự.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="set-confirm">Nhập lại mật khẩu</FieldLabel>
                <PasswordInput id="set-confirm" name="confirm" minLength={8} required autoComplete="new-password" />
              </Field>
              <Button type="submit" size="lg" className="w-full">
                Lưu mật khẩu
              </Button>
            </FieldGroup>
          </ActionForm>
        </CardContent>
      </Card>
    </main>
  );
}
