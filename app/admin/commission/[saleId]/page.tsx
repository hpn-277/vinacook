import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoSubmitForm } from "@/components/AutoSubmitForm";
import { PageTitle } from "@/components/page-title";
import { SaleMonthReport } from "@/components/SaleMonthReport";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseIsoDate } from "@/lib/domain/time";
import { today } from "@/lib/period";

export default async function SaleCommissionPage({ params, searchParams }: PageProps<"/admin/commission/[saleId]">) {
  await requireRole("manager");
  const saleId = Number((await params).saleId);
  const raw = (await searchParams).month;
  const month = (typeof raw === "string" && parseIsoDate(`${raw}-01`)?.slice(0, 7)) || today().slice(0, 7);

  const { data: sale } = await db().from("staff").select("id, name, ref_code, commission_pct").eq("id", saleId).eq("role", "sale").maybeSingle();
  if (!Number.isInteger(saleId) || !sale) notFound();

  return (
    <>
      <Link href={`/admin/commission?month=${month}`} className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">
        ‹ Hoa hồng tháng {month}
      </Link>
      <PageTitle>
        {sale.name} <span className="font-mono text-base font-normal text-muted-foreground">{sale.ref_code}</span>
      </PageTitle>
      <AutoSubmitForm action={`/admin/commission/${saleId}`} className="mb-4">
        <Input type="month" name="month" defaultValue={month} aria-label="Chọn tháng" className="w-auto" />
      </AutoSubmitForm>

      <SaleMonthReport sale={sale} month={month} orderLinks />
    </>
  );
}
