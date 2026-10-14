"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui";
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Sản phẩm</th>
              <th className="p-2">Cần</th>
              {factories.map((f) => (
                <th key={f.id} className="p-2">
                  {f.name}
                </th>
              ))}
              <th className="p-2">Đã chia</th>
            </tr>
          </thead>
          <tbody>
            {needs.map((p) => {
              const ok = rowSum(p.id) === round2(p.need);
              return (
                <tr key={p.id} className="border-t" data-product={p.name}>
                  <td className="p-2 font-medium">{p.name}</td>
                  <td className="p-2">{formatKg(p.need)}</td>
                  {factories.map((f) => (
                    <td key={f.id} className="p-2">
                      <input
                        name={`alloc_${p.id}_${f.id}`}
                        aria-label={`${p.name} - ${f.name}`}
                        type="number"
                        min={0}
                        step={0.5}
                        value={alloc[p.id]?.[f.id] ?? ""}
                        onChange={(e) =>
                          setAlloc((a) => ({ ...a, [p.id]: { ...a[p.id], [f.id]: Number(e.target.value) } }))
                        }
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-right"
                      />
                    </td>
                  ))}
                  <td className={`p-2 font-medium ${ok ? "text-green-700" : "text-red-700"}`}>{formatKg(rowSum(p.id))}</td>
                </tr>
              );
            })}
            <tr className="border-t bg-gray-50">
              <td className="p-2" colSpan={2}>
                Tổng / công suất
              </td>
              {factories.map((f) => {
                const over = colSum(f.id) > f.capacity;
                return (
                  <td key={f.id} className={`p-2 ${over ? "font-semibold text-amber-700" : ""}`}>
                    {formatKg(colSum(f.id))} / {formatKg(f.capacity)}
                    {over && <div role="note">Vượt công suất</div>}
                  </td>
                );
              })}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      {!complete && <p className="text-sm text-red-700">Phải chia đủ 100% số kg của từng sản phẩm trước khi gửi.</p>}
      <Button type="submit" disabled={!complete}>
        Chốt ngày và gửi xưởng
      </Button>
    </ActionForm>
  );
}
