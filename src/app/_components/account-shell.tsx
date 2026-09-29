import type { ReactNode } from "react";

export function AccountShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
    <section className="w-full max-w-md rounded-lg border border-default bg-panel p-6 sm:p-8">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-action-hover">PM / Centro de operaciones</p>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-primary">{title}</h1>
      <p className="mb-6 mt-2 text-sm leading-6 text-secondary">{description}</p>
      {children}
    </section>
  </main>;
}
