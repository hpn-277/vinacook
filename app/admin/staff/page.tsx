import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { PageTitle } from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { unwrap } from "@/lib/action";
import { requireRole, ROLE_LABEL, type StaffRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendPasswordLink } from "./actions";
import { CreateStaffDialog } from "./CreateStaffDialog";
import { EditStaffDialog } from "./EditStaffDialog";

const ROLES = Object.keys(ROLE_LABEL) as StaffRole[];

export default async function StaffPage({ searchParams }: PageProps<"/admin/staff">) {
  const me = await requireRole("manager");
  const raw = (await searchParams).role;
  const role = ROLES.find((r) => r === raw);
  const [staff, factories, users] = await Promise.all([
    db().from("staff").select("*, factories(name)").order("role").order("id").then(unwrap),
    db().from("factories").select("id, name").eq("active", true).order("id").then(unwrap),
    db().auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const counts = new Map(ROLES.map((r) => [r, staff.filter((s) => s.role === r).length]));
  const shown = role ? staff.filter((s) => s.role === role) : staff;
  const roles = Object.entries(ROLE_LABEL) as [StaffRole, string][];
  const hasSales = shown.some((s) => s.role === "sale");
  const login = new Map((users.data?.users ?? []).map((u) => [u.id, { email: u.email, signedIn: Boolean(u.last_sign_in_at) }]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 [&_h1]:mb-0">
        <PageTitle>Nhân viên</PageTitle>
        <CreateStaffDialog roles={roles} factories={factories} />
      </div>
      <Card size="sm">
        <CardHeader>
          <CardTitle className="font-semibold">
            <h2>Danh sách ({shown.length})</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <nav aria-label="Lọc theo vai trò" className="flex flex-wrap gap-2">
            {[undefined, ...ROLES].map((r) => {
              const count = r ? counts.get(r) : staff.length;
              if (r && !count) return null;
              return (
                <Badge key={r ?? "all"} asChild variant={r === role ? "default" : "outline"} className="h-7 px-2.5 text-sm">
                  <Link href={r ? `/admin/staff?role=${r}` : "/admin/staff"} aria-current={r === role ? "page" : undefined}>
                    {r ? ROLE_LABEL[r] : "Tất cả"} ({count})
                  </Link>
                </Badge>
              );
            })}
          </nav>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên / vai trò</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>SĐT</TableHead>
                {hasSales && <TableHead>% hoa hồng</TableHead>}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((s) => {
                const account = login.get(s.auth_user_id);
                return (
                  <TableRow key={s.id} className={s.active ? undefined : "opacity-60"} data-staff={s.name}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {s.name}
                        {!s.active && <Badge variant="outline">Đã khóa</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ROLE_LABEL[s.role]}
                        {s.ref_code && <span className="font-mono"> · {s.ref_code}</span>}
                        {s.factories?.name && <> · {s.factories.name}</>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{account?.email ?? "—"}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2">
                        {account && !account.signedIn && (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                            Chưa đăng nhập
                          </Badge>
                        )}
                        {account?.email && s.active && (
                          <ActionForm action={sendPasswordLink} confirm={`Gửi link đặt mật khẩu tới ${account.email}?`}>
                            <input type="hidden" name="id" value={s.id} />
                            <Button variant="link" size="xs" className="h-auto px-0">
                              Gửi lại link
                            </Button>
                          </ActionForm>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{s.phone ?? "—"}</TableCell>
                    {hasSales && <TableCell className="tabular-nums">{s.role === "sale" ? `${s.commission_pct ?? 0}%` : ""}</TableCell>}
                    <TableCell className="text-right">
                      {(s.role !== "manager" || s.id === me.id) && <EditStaffDialog staff={s} roles={roles} factories={factories} email={account?.email} isSelf={s.id === me.id} />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
