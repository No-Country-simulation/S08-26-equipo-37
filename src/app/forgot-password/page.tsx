import Link from "next/link";
import { AccountShell } from "../_components/account-shell";
import { AccountForm } from "../_components/account-form";
import { forgotPasswordAction } from "../auth-actions";

export default function ForgotPassword() {
  return <AccountShell title="Recuperar acceso" description="Ingresá tu email para solicitar un enlace de recuperación.">
    <AccountForm action={forgotPasswordAction} submitLabel="Solicitar enlace"><label className="admin-label">Email<input autoComplete="email" className="admin-input" maxLength={254} name="email" required type="email" /></label></AccountForm>
    <Link className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-action-hover" href="/login">Volver a ingresar</Link>
  </AccountShell>;
}
