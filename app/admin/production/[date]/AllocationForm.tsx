"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action";
import { formatKg } from "@/lib/domain/money";

type Need = { id: number; name: string; need: number };
type Factory = { id: number; name: string; capacity: number };
type Alloc = Record<number, Record<number, number>>;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function AllocationForm({
  date,
  needs,
  factories,
  action,
}: {
  date: string;
  needs: Need[];
  factories: Factory[];
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
}) {
  const [alloc, setAlloc] = useState<Alloc>(() =>
    Object.fromEntries(needs.map((p) => [p.id, factories[0] ? { [factories[0].id]: p.need } : {}])),
  );
  const rowSum = (pid: number) => round2(Object.values(alloc[pid] ?? {}).reduce((s, v) => s + v, 0));
  const colSum = (fid: number) => round2(needs.reduce((s, p) => s + (alloc[p.id]?.[fid] ?? 0), 0));
  const complete = needs.every((p) => rowSum(p.id) === round2(p.need));

  return (
    <ActionForm action={action} className="space-y-3">
      <input type="hidden" name="date" value={date} />
      <Table className="min-w-[480px]">
        <TableHeader>
          <TableRow>
            <TableHead>Sản phẩm</TableHead>
            <TableHead className="text-right">Cần</TableHead>
            {factories.map((f) => (
              <TableHead key={f.id}>{f.name}</TableHead>
            ))}
            <TableHead className="text-right">Đã chia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {needs.map((p) => {
            const ok = rowSum(p.id) === round2(p.need);
            return (
              <TableRow key={p.id} data-product={p.name}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-right">{formatKg(p.need)}</TableCell>
                {factories.map((f) => (
                  <TableCell key={f.id}>
                    <Input
                      name={`alloc_${p.id}_${f.id}`}
                      aria-label={`${p.name} - ${f.name}`}
                      type="number"
                      min={0}
                      step={0.5}
                      value={alloc[p.id]?.[f.id] ?? ""}
                      onChange={(e) => setAlloc((a) => ({ ...a, [p.id]: { ...a[p.id], [f.id]: Number(e.target.value) } }))}
                      className="w-24 text-right"
                    />
                  </TableCell>
                ))}
                <TableCell className={cn("text-right font-medium", ok ? "text-green-700" : "text-destructive")}>{formatKg(rowSum(p.id))}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Tổng / công suất</TableCell>
            {factories.map((f) => {
              const over = colSum(f.id) > f.capacity;
              return (
                <TableCell key={f.id} className={cn("font-normal", over && "font-semibold text-amber-700")}>
                  {formatKg(colSum(f.id))} / {formatKg(f.capacity)}
                  {over && <div role="note">Vượt công suất</div>}
                </TableCell>
              );
            })}
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
      {!complete && <p className="text-sm text-destructive">Phải chia đủ 100% số kg của từng sản phẩm trước khi gửi.</p>}
      <Button type="submit" size="lg" disabled={!complete}>
        Chốt ngày và gửi xưởng
      </Button>
    </ActionForm>
  );
}
