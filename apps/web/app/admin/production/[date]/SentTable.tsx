"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { JobBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatKg } from "@noodle/core/domain/money";
import type { JobStatus } from "@noodle/core/domain/status";

export type SentGroup = {
  factory: { id: number; name: string };
  kg: number;
  lines: { product: string; kg: number; job: { id: number; status: JobStatus } }[];
};

/** What each factory was sent; tick the factories whose goods arrived and confirm them together. */
export function SentTable({ groups, date }: { groups: SentGroup[]; date: string }) {
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set());
  const pending = groups.filter((g) => g.lines.some((l) => l.job.status === "producing"));
  const selected = pending.filter((g) => picked.has(g.factory.id));
  const allPicked = pending.length > 0 && selected.length === pending.length;

  const toggle = (ids: number[], on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              {pending.length > 0 && (
                <Checkbox
                  checked={allPicked ? true : selected.length > 0 ? "indeterminate" : false}
                  onCheckedChange={(v) => toggle(pending.map((g) => g.factory.id), v === true)}
                  aria-label="Chọn tất cả xưởng chưa nhận hàng"
                />
              )}
            </TableHead>
            <TableHead>Xưởng</TableHead>
            <TableHead>Sản phẩm</TableHead>
            <TableHead className="text-right">Kg</TableHead>
            <TableHead>Nhận hàng</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(({ factory: f, kg, lines }) => {
            const received = lines.every((l) => l.job.status === "received");
            return lines.map((l, idx) => (
              <TableRow key={l.job.id} data-factory={f.name} data-job-id={l.job.id}>
                {idx === 0 && (
                  <>
                    <TableCell rowSpan={lines.length} className="align-top">
                      {received ? (
                        <span className="text-green-700" title="Đã nhận hàng">
                          ✓
                        </span>
                      ) : (
                        <Checkbox checked={picked.has(f.id)} onCheckedChange={(v) => toggle([f.id], v === true)} aria-label={`Chọn ${f.name}`} />
                      )}
                    </TableCell>
                    <TableCell rowSpan={lines.length} className="align-top font-medium">
                      <Link href={`/admin/factories/${f.id}`} className="underline-offset-4 hover:underline">
                        {f.name}
                      </Link>
                      <div className="text-xs font-normal text-muted-foreground">Tổng {formatKg(kg)}</div>
                    </TableCell>
                  </>
                )}
                <TableCell>{l.product}</TableCell>
                <TableCell className="text-right tabular-nums">{formatKg(l.kg)}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">#{l.job.id}</span>
                    <JobBadge status={l.job.status} />
                  </span>
                </TableCell>
              </TableRow>
            ));
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Tổng</TableCell>
            <TableCell className="text-right tabular-nums">{formatKg(Math.round(groups.reduce((s, g) => s + g.kg, 0) * 100) / 100)}</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>

      {pending.length > 0 && (
        <ActionForm
          action="receiveFactory"
          confirm={`Đã nhận đủ hàng ${selected.map((g) => g.factory.name).join(", ")} ngày ${date}?`}
          onSuccess={() => setPicked(new Set())}
          className="flex flex-wrap items-center gap-3"
        >
          <input type="hidden" name="date" value={date} />
          {selected.map((g) => (
            <input key={g.factory.id} type="hidden" name="factory_id" value={g.factory.id} />
          ))}
          <Button disabled={selected.length === 0}>Xác nhận đã nhận hàng{selected.length > 0 && ` (${selected.length} xưởng)`}</Button>
          <span className="text-xs text-muted-foreground">Tick các xưởng đã giao hàng tới. Đơn chuyển sang Đã nhận hàng khi mọi xưởng trong đơn đã giao.</span>
        </ActionForm>
      )}
    </>
  );
}
