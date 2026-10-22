"use client";

import { Input } from "@/components/ui/input";
import { downscale } from "@/lib/downscale";

const MAX_SIDE = 800;

/** Swaps the picked file for a downscaled JPEG before the form submits it (as `image_file` unless `name` says otherwise). */
export function ImageFileInput({ form, label, name = "image_file" }: { form: string; label: string; name?: string }) {
  return (
    <Input
      form={form}
      name={name}
      type="file"
      accept="image/*"
      aria-label={label}
      className="min-w-40 text-xs"
      onChange={async (e) => {
        const input = e.currentTarget;
        const file = input.files?.[0];
        if (!file) return;
        const blob = await downscale(file, MAX_SIDE).catch(() => null);
        if (!blob) return;
        const files = new DataTransfer();
        files.items.add(new File([blob], "image.jpg", { type: "image/jpeg" }));
        input.files = files.files;
      }}
    />
  );
}
