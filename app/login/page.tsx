import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { Button, Card, Field, inputClass, PageTitle } from "@/components/ui";
import { currentStaff, ROLE_HOME } from "@/lib/auth";
import { login } from "./actions";

export default async function LoginPage() {
  const staff = await currentStaff();
  if (staff) redirect(ROLE_HOME[staff.role]);
  return (
    <main className="mx-auto max-w-sm p-4 pt-16">
      <PageTitle>Đăng nhập nhân viên</PageTitle>
      <Card>
        <ActionForm action={login} className="space-y-3">
          <Field label="Email">
            <input name="email" type="email" required autoComplete="username" className={inputClass} />
          </Field>
          <Field label="Mật khẩu">
            <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
          </Field>
          <Button type="submit" className="w-full">
            Đăng nhập
          </Button>
        </ActionForm>
      </Card>
    </main>
  );
}
