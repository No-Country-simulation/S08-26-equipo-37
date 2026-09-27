import Link from "next/link";
import { AccountShell } from "@/app/_components/account-shell";
import { AccountForm } from "@/app/_components/account-form";
import { resetPasswordAction } from "@/app/auth-actions";
import { inspectAccountToken } from "@/modules/identity/service";

export default async function ResetPassword({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const state = await inspectAccountToken("reset", token);
  return <AccountShell title="Nueva contraseña" description={state.valid ? "Usá al menos 12 caracteres. Al guardar, se cerrarán todas las sesiones anteriores." : "El enlace venció o ya fue utilizado. Solicitá una nueva recuperación."}>
    {state.valid ? <AccountForm action={resetPasswordAction} submitLabel="Guardar contraseña"><input name="token" type="hidden" value={token} /><label className="admin-label">Nueva contraseña<input autoComplete="new-password" className="admin-input" maxLength={128} minLength={12} name="password" required type="password" /></label></AccountForm> : <Link className="admin-button" href="/forgot-password">Solicitar nuevo enlace</Link>}
  </AccountShell>;
}
