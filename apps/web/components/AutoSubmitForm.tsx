"use client";

import Form from "next/form";
import type { ComponentProps } from "react";

export function AutoSubmitForm(props: Omit<ComponentProps<typeof Form>, "action" | "onChange"> & { action: string }) {
  return <Form {...props} onChange={(e) => e.currentTarget.requestSubmit()} />;
}
