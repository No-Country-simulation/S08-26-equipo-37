import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "../_components/account-shell";
import { AccountForm } from "../_components/account-form";
import { loginAction } from "../auth-actions";
import { getCurrentUser } from "@/modules/identity/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, getDemoConfig } from "@/modules/identity/demo";

export default async function Login({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/profile?password=required" : "/");
  const { updated } = await searchParams;
  return <AccountShell title="Ingresar" description="Accedé con la cuenta habilitada por tu administración.">
    {getDemoConfig() ? <section className="mb-5 rounded-lg border border-default bg-subtle p-4 text-sm" aria-label="Acceso público a la demostración">
      <p className="font-semibold">Demostración de solo lectura</p>
      <p className="mt-2">La simulación finalizó. Podés recorrer el dashboard y los equipos sin modificar datos.</p>
      <ul className="mt-3 space-y-1">{DEMO_ACCOUNTS.map((account) => <li key={account.email}><span className="font-medium">{account.theme === "light" ? "Tema claro" : "Tema oscuro"}:</span> <code className="break-all">{account.email}</code></li>)}</ul>
      <p className="mt-2">Contraseña pública: <code className="break-all">{DEMO_PASSWORD}</code></p>
    </section> : null}
    {updated === "1" ? <p className="mb-4 text-sm text-success-strong" role="status">Contraseña guardada. Iniciá sesión con tus nuevas credenciales.</p> : null}
    <AccountForm action={loginAction} submitLabel="Ingresar">
      <label className="admin-label">Email<input autoComplete="username" className="admin-input" maxLength={254} name="email" required type="email" /></label>
      <label className="admin-label">Contraseña<input autoComplete="current-password" className="admin-input" maxLength={128} name="password" required type="password" /></label>
    </AccountForm>
    <Link className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-action-hover" href="/forgot-password">Olvidé mi contraseña</Link>
  </AccountShell>;
}
