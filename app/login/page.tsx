import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { currentStaff, ROLE_HOME } from "@/lib/auth";
import { login } from "./actions";

const NOTICE: Record<string, { text: string; error?: boolean }> = {
  "link=expired": { text: "Link đã hết hạn hoặc đã được dùng. Bấm “Quên mật khẩu?” để nhận link mới.", error: true },
  "password=set": { text: "Đã đặt mật khẩu nhưng tài khoản chưa được cấp quyền. Liên hệ quản lý." },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const staff = await currentStaff();
  if (staff) redirect(ROLE_HOME[staff.role]);
  const sp = await searchParams;
  const notice = Object.entries(NOTICE).find(([key]) => {
    const [k, v] = key.split("=");
    return sp[k] === v;
  })?.[1];
  return (
    <main className="mx-auto max-w-sm p-4 pt-16">
      <PageTitle>Đăng nhập nhân viên</PageTitle>
      {notice && (
        <Alert variant={notice.error ? "destructive" : "default"} className="mb-4">
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent>
          <ActionForm action={login}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="login-email">Email</FieldLabel>
                <Input id="login-email" name="email" type="email" required autoComplete="username" />
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="login-password">Mật khẩu</FieldLabel>
                  <Link href="/forgot-password" className="text-sm text-primary underline-offset-4 hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>
                <PasswordInput id="login-password" name="password" required autoComplete="current-password" />
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
