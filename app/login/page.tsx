import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { currentStaff, ROLE_HOME } from "@/lib/auth";
import { login } from "./actions";

export default async function LoginPage() {
  const staff = await currentStaff();
  if (staff) redirect(ROLE_HOME[staff.role]);
  return (
    <main className="mx-auto max-w-sm p-4 pt-16">
      <PageTitle>Đăng nhập nhân viên</PageTitle>
      <Card>
        <CardContent>
          <ActionForm action={login}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="login-email">Email</FieldLabel>
                <Input id="login-email" name="email" type="email" required autoComplete="username" />
              </Field>
              <Field>
                <FieldLabel htmlFor="login-password">Mật khẩu</FieldLabel>
                <Input id="login-password" name="password" type="password" required autoComplete="current-password" />
              </Field>
              <Button type="submit" size="lg" className="w-full">
                Đăng nhập
              </Button>
            </FieldGroup>
          </ActionForm>
        </CardContent>
      </Card>
    </main>
  );
}
