"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordInput({ className, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={shown ? "text" : "password"} className={cn("pr-10", className)} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setShown(!shown)}
        aria-label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        aria-pressed={shown}
        className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
      >
        {shown ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}
