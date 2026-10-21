"use client";

import { useEffect } from "react";
import { applyRowFilters, NO_DRIVER } from "./row-filters";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export function DriverFilter({ drivers, unassigned }: { drivers: { id: number; name: string; count: number }[]; unassigned: number }) {
  useEffect(() => applyRowFilters, []);
  return (
    <NativeSelect data-row-filter="driver" defaultValue="" onChange={applyRowFilters} aria-label="Lọc theo tài xế">
      <NativeSelectOption value="">Tất cả tài xế</NativeSelectOption>
      {drivers.map((d) => (
        <NativeSelectOption key={d.id} value={String(d.id)}>
          {d.name} ({d.count})
        </NativeSelectOption>
      ))}
      <NativeSelectOption value={NO_DRIVER}>Chưa có tài xế ({unassigned})</NativeSelectOption>
    </NativeSelect>
  );
}
