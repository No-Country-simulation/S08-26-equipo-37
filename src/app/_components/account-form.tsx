"use client";

import { useActionState, type ReactNode } from "react";

export type AccountFormState = { error?: string; success?: string };

export function AccountForm({ action, children, submitLabel, inline = false }: {
  action: (state: AccountFormState, formData: FormData) => Promise<AccountFormState>;
  children: ReactNode;
  submitLabel: string;
  inline?: boolean;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className={inline ? "flex flex-wrap items-center gap-3" : "grid gap-4"}>
      {children}
      {state.error ? <p className={inline ? "order-last basis-full text-sm text-critical-strong" : "rounded border border-critical-border bg-critical-subtle p-3 text-sm text-critical-strong"} role="alert">{state.error}</p> : null}
      {state.success ? <p className={inline ? "order-last basis-full text-sm text-success-strong" : "rounded border border-success-border bg-success-subtle p-3 text-sm text-success-strong"} role="status">{state.success}</p> : null}
      <button className="admin-button" disabled={pending} type="submit">{pending ? "Procesando…" : submitLabel}</button>
    </form>
  );
}
