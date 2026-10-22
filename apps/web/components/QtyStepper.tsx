import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** `scope` keeps labels unique when the same pack has a second stepper on the page ("Số lượng trong chi tiết Mì trứng - Kg"). */
export function QtyStepper({ label, scope, value, onChange }: { label: string; scope?: string; value: number; onChange: (qty: number) => void }) {
  const name = scope ? `${scope} ${label}` : label;
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button type="button" variant="outline" size="icon" aria-label={`Bớt ${name}`} disabled={value === 0} onClick={() => onChange(value - 1)}>
        <Minus />
      </Button>
      <Input
        aria-label={`Số lượng ${name}`}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={value || ""}
        placeholder="0"
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-12 px-1 text-center"
      />
      <Button type="button" variant="outline" size="icon" aria-label={`Thêm ${name}`} onClick={() => onChange(value + 1)}>
        <Plus />
      </Button>
    </div>
  );
}
