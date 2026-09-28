import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "../_components/account-shell";
import { AccountForm } from "../_components/account-form";
import { loginAction } from "../auth-actions";
import { getCurrentUser } from "@/modules/identity/auth";

export default async function Login({ searchParams }: { searchParams: Promise<{ updated?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/profile?password=required" : "/");
  const { updated } = await searchParams;
  return <AccountShell title="Ingresar" description="Accedé con la cuenta habilitada por tu administración.">
    {updated === "1" ? <p className="mb-4 text-sm text-emerald-800" role="status">Contraseña guardada. Iniciá sesión con tus nuevas credenciales.</p> : null}
    <AccountForm action={loginAction} submitLabel="Ingresar">
      <label className="admin-label">Email<input autoComplete="username" className="admin-input" maxLength={254} name="email" required type="email" /></label>
      <label className="admin-label">Contraseña<input autoComplete="current-password" className="admin-input" maxLength={128} name="password" required type="password" /></label>
    </AccountForm>
    <Link className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-teal-800" href="/forgot-password">Olvidé mi contraseña</Link>
  </AccountShell>;
}
