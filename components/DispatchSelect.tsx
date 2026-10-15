"use client";

import { useEffect, useState } from "react";
import { applyRowFilters } from "@/components/row-filters";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const boxes = (form: string) => document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][form="${form}"][name="order_id"]`);
const visible = (box: HTMLInputElement) => !box.closest("tr")?.hidden;

/** Rows live outside the form and join it via the HTML `form` attribute, so selection is driven through the DOM. */
export function DispatchSelect({ form, districts }: { form: string; districts: { name: string; count: number }[] }) {
  const [district, setDistrict] = useState("");
  const [all, setAll] = useState(false);

  // Remounted (via key) whenever the unassigned set changes, and unmounted once nothing is left to assign:
  // either way show every row again with nothing ticked.
  useEffect(() => {
    const reset = () => {
      applyRowFilters();
      for (const box of boxes(form)) box.checked = false;
    };
    reset();
    return reset;
  }, [form]);

  function pickDistrict(next: string) {
    setDistrict(next);
    applyRowFilters();
    for (const box of boxes(form)) box.checked = next !== "" && visible(box);
    setAll(next !== "");
  }

  return (
    <>
      <NativeSelect data-row-filter="district" value={district} onChange={(e) => pickDistrict(e.target.value)} aria-label="Lọc theo quận">
        <NativeSelectOption value="">Tất cả quận</NativeSelectOption>
        {districts.map((d) => (
          <NativeSelectOption key={d.name} value={d.name}>
            {d.name} ({d.count})
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={all}
          onChange={(e) => {
            setAll(e.target.checked);
            for (const box of boxes(form)) box.checked = e.target.checked && visible(box);
          }}
        />
        Chọn tất cả
      </label>
    </>
  );
}
