import * as SecureStore from "expo-secure-store";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import type { StaffRole } from "@noodle/core/staff";
import { API_URL } from "@/lib/config";

export type Profile = { id: number; name: string; role: StaffRole; phone: string | null; ref_code: string | null; factory_id: number | null };
export type Session = { access_token: string; refresh_token: string; expires_at: number; staff: Profile };

const KEY = "session";
let current: Session | null = null;
const listeners = new Set<(s: Session | null) => void>();

function save(next: Session | null) {
  current = next;
  listeners.forEach((l) => l(next));
  void (next ? SecureStore.setItemAsync(KEY, JSON.stringify(next)) : SecureStore.deleteItemAsync(KEY));
}

async function post(path: string, body: unknown): Promise<Session> {
  const res = await fetch(`${API_URL}/api/v1/auth/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as Session & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Có lỗi xảy ra, vui lòng thử lại");
  return json;
}

export async function signIn(email: string, password: string) {
  save(await post("session", { email: email.trim(), password }));
}

export function signOut() {
  save(null);
}

let refreshing: Promise<Session | null> | null = null;

/** A valid access token, refreshed a minute before expiry; signs out when the refresh token is rejected. */
export async function accessToken(): Promise<string | null> {
  if (!current) return null;
  if (current.expires_at * 1000 - Date.now() > 60_000) return current.access_token;
  refreshing ??= post("refresh", { refresh_token: current.refresh_token })
    .then((s) => (save(s), s))
    .catch(() => (save(null), null))
    .finally(() => (refreshing = null));
  return (await refreshing)?.access_token ?? null;
}

const SessionContext = createContext<{ session: Session | null; ready: boolean }>({ session: null, ready: false });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ session: Session | null; ready: boolean }>({ session: null, ready: false });
  useEffect(() => {
    const listen = (session: Session | null) => setState({ session, ready: true });
    listeners.add(listen);
    SecureStore.getItemAsync(KEY)
      .then((raw) => {
        current = raw ? (JSON.parse(raw) as Session) : null;
        listen(current);
      })
      .catch(() => listen(null));
    return () => void listeners.delete(listen);
  }, []);
  return <SessionContext value={state}>{children}</SessionContext>;
}

export const useSession = () => use(SessionContext);
