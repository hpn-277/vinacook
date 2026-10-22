import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto max-w-sm p-4 pt-16">
      <PageTitle>Quên mật khẩu</PageTitle>
      <Card>
        <CardContent>
          <ActionForm action="requestReset">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="reset-email">Email</FieldLabel>
                <Input id="reset-email" name="email" type="email" required autoComplete="username" />
              </Field>
              <Button type="submit" size="lg" className="w-full">
                Gửi link đặt lại mật khẩu
              </Button>
            </FieldGroup>
          </ActionForm>
        </CardContent>
      </Card>
      <Link href="/login" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground">
        ‹ Quay lại đăng nhập
      </Link>
    </main>
  );
}
