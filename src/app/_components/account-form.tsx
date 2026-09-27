"use client";

import { useActionState, type ReactNode } from "react";

export type AccountFormState = { error?: string; success?: string };

export function AccountForm({ action, children, submitLabel }: {
  action: (state: AccountFormState, formData: FormData) => Promise<AccountFormState>;
  children: ReactNode;
  submitLabel: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="grid gap-4">
      {children}
      {state.error ? <p className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{state.error}</p> : null}
      {state.success ? <p className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{state.success}</p> : null}
      <button className="admin-button" disabled={pending} type="submit">{pending ? "Procesando…" : submitLabel}</button>
    </form>
  );
}
