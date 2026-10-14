"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionResult } from "@/lib/action";

type Props = {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  confirm?: string;
};

export function ActionForm({ action, children, className, confirm }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state && !state.ok && (
        <p role="alert" className="mt-2 w-full text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.ok && state.message && (
        <p role="status" className="mt-2 w-full text-sm text-green-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
