import Link from "next/link";
import type { ReactNode } from "react";
import { getAdminNavigation } from "@/modules/admin/service";

export const metadata = { title: "Administración | PredictiveMaintenance", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { actorName, sections } = await getAdminNavigation();
  return <div className="min-h-dvh bg-canvas text-primary"><a className="skip-link" href="#admin-content">Ir al contenido de administración</a><header className="border-b border-default bg-panel"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8"><Link className="inline-flex min-h-11 items-center gap-3 font-semibold" href="/"><span aria-hidden="true" className="grid size-9 place-items-center rounded border border-strong font-mono text-xs">PM</span>PredictiveMaintenance</Link><div className="flex items-center gap-5 text-sm"><span className="text-secondary">{actorName}</span><Link className="inline-flex min-h-11 items-center text-action" href="/profile">Perfil</Link><Link className="inline-flex min-h-11 items-center text-action" href="/">Volver al panel</Link></div></div><nav aria-label="Administración" className="mx-auto flex max-w-[1440px] flex-wrap gap-x-6 border-t border-soft px-4 sm:px-8">{sections.map((section) => <Link className="inline-flex min-h-12 items-center border-b-2 border-transparent text-sm font-medium text-secondary hover:border-action hover:text-action-hover" href={section.href} key={section.href}>{section.label}</Link>)}</nav></header><main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-8" id="admin-content" tabIndex={-1}>{children}</main><footer className="mx-auto max-w-[1440px] px-4 pb-6 text-xs text-secondary sm:px-8">Administración de identidades y accesos · Horarios expresados en UTC</footer></div>;
}
