"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";
import type { Cart } from "@/lib/domain/catalog";
import { DISTRICTS } from "@/lib/domain/districts";

/** A JSON value in localStorage shared by every component on the page. Storage can throw (private mode), so it degrades to the fallback. */
function localStore<T>(key: string, schema: z.ZodType<T>, fallback: T) {
  const listeners = new Set<() => void>();
  let snapshot: string | null = null;
  const read = () => {
    try {
      return localStorage.getItem(key) ?? "null";
    } catch {
      return "null";
    }
  };
  const parse = (raw: string): T => {
    try {
      const parsed = schema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    set(value: T) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
      snapshot = null;
      listeners.forEach((l) => l());
    },
    use(): T {
      const raw = useSyncExternalStore(
        (l) => {
          listeners.add(l);
          return () => listeners.delete(l);
        },
        () => (snapshot ??= read()),
        () => "null",
      );
      return parse(raw);
    },
  };
}

const cartStore = localStore<Cart>("cart-packs", z.record(z.string(), z.number()), {});

export const useCart = cartStore.use;
export function setCart(cart: Cart) {
  cartStore.set(Object.fromEntries(Object.entries(cart).filter(([, qty]) => qty > 0)));
}

const contactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  address: z.string(),
  district: z.enum(DISTRICTS).or(z.literal("")),
});
export type Contact = z.infer<typeof contactSchema>;

/** The customer of the last order placed or re-ordered from this browser. */
const contactStore = localStore<Contact | null>("customer", contactSchema.nullable(), null);
export const useContact = contactStore.use;
export const rememberContact = contactStore.set;
