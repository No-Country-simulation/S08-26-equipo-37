"use client";

import { useActionState, useState, type ReactNode } from "react";

export type AdminActionState = { error?: string; success?: string; link?: string };

export function AdminForm({ action, children, submitLabel, confirmLabel, className = "space-y-4" }: {
  action: (previous: AdminActionState, data: FormData) => Promise<AdminActionState>;
  children: ReactNode;
  submitLabel: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [copyMessage, setCopyMessage] = useState("");

  async function copyLink() {
    if (!state.link) return;
    try {
      await navigator.clipboard.writeText(state.link);
      setCopyMessage("Enlace copiado.");
    } catch {
      setCopyMessage("Seleccioná y copiá el enlace del campo.");
    }
  }

  return (
    <form action={formAction} className={className}>
      <fieldset className="min-w-0 space-y-4" disabled={pending}>
        {children}
        {confirmLabel ? <label className="flex min-h-11 items-center gap-3 text-sm text-slate-700"><input className="size-4 shrink-0 accent-teal-700" name="confirmed" required type="checkbox" value="yes" />{confirmLabel}</label> : null}
        <button className="admin-button" type="submit">{pending ? "Guardando…" : submitLabel}</button>
      </fieldset>
      {state.error ? <p className="text-sm text-rose-700" role="alert">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-700" role="status">{state.success}</p> : null}
      {state.link ? <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3"><label className="admin-label">Enlace privado de un solo uso<input className="admin-input font-mono text-xs" readOnly value={state.link} /></label><button className="admin-button" onClick={copyLink} type="button">Copiar enlace</button><p aria-live="polite" className="text-xs text-slate-600">{copyMessage || "Compartilo solamente con la persona destinataria. No se guarda en auditoría."}</p></div> : null}
    </form>
  );
}
