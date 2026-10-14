"use client";

import { useSyncExternalStore } from "react";

export type Cart = Record<string, number>;
const KEY = "cart";
const listeners = new Set<() => void>();
let snapshot: string | null = null;

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

export function setCart(cart: Cart) {
  const clean = Object.fromEntries(Object.entries(cart).filter(([, kg]) => kg > 0));
  try {
    localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {}
  snapshot = null;
  listeners.forEach((l) => l());
}

export function useCart(): Cart {
  const raw = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (snapshot ??= read()),
    () => "{}",
  );
  return JSON.parse(raw) as Cart;
}
