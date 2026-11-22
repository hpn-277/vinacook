import { useMutation, useQueryClient } from "@tanstack/react-query";
import { json } from "@/lib/api";

type Done = { message?: string };

/**
 * One write: runs `call`, then refetches every screen's data (the web app's router.refresh()).
 * `result` holds the API's success message or error for an inline <Notice>.
 */
export function useAction<V = void>(call: (vars: V) => Promise<{ ok: boolean; json(): Promise<unknown> }>, onSuccess?: (done: Done) => void) {
  const client = useQueryClient();
  const m = useMutation({
    mutationFn: (vars: V) => json(call(vars)) as Promise<Done>,
    onSuccess: async (done) => {
      await client.invalidateQueries();
      onSuccess?.(done);
    },
  });
  const result = m.isError ? { ok: false as const, text: m.error.message } : m.isSuccess && m.data?.message ? { ok: true as const, text: m.data.message } : null;
  return { run: m.mutate, pending: m.isPending, result, reset: m.reset };
}
