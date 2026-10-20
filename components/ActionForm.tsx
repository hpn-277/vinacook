"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ActionResult } from "@/lib/action";

type Props = {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  confirm?: string;
  id?: string;
  onSuccess?: () => void;
};

export function ActionForm({ action, children, className, confirm, id, onSuccess }: Props) {
  const [state, formAction, pending] = useActionState(async (prev: ActionResult, fd: FormData) => {
    const result = await action(prev, fd);
    if (result?.ok) onSuccess?.();
    return result;
  }, null);
  const form = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const [asking, setAsking] = useState(false);
  return (
    <form
      ref={form}
      id={id}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !confirmed.current) {
          e.preventDefault();
          setAsking(true);
        }
        confirmed.current = false;
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state && !state.ok && (
        <Alert variant="destructive" className="mt-2 w-full">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state?.ok && state.message && (
        <Alert role="status" className="mt-2 w-full border-green-200 bg-green-50 text-green-800">
          <AlertDescription className="text-green-800">{state.message}</AlertDescription>
        </Alert>
      )}
      {confirm && (
        <AlertDialog open={asking} onOpenChange={setAsking}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm}</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Quay lại</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  confirmed.current = true;
                  form.current?.requestSubmit();
                }}
              >
                Xác nhận
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </form>
  );
}
