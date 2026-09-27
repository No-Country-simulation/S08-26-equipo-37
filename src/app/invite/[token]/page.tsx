import Link from "next/link";
import { AccountShell } from "@/app/_components/account-shell";
import { AccountForm } from "@/app/_components/account-form";
import { acceptInvitationAction } from "@/app/auth-actions";
import { inspectAccountToken } from "@/modules/identity/service";

export default async function AcceptInvitation({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await inspectAccountToken("invitation", token);
  return <AccountShell title="Activar tu acceso" description={invitation.valid ? `Invitación para ${invitation.email}. Elegí una contraseña de al menos 12 caracteres.` : "El enlace venció, ya fue utilizado o la invitación no está habilitada. Solicitá uno nuevo a la administración."}>
    {invitation.valid ? <AccountForm action={acceptInvitationAction} submitLabel="Activar cuenta"><input name="token" type="hidden" value={token} /><label className="admin-label">Nueva contraseña<input autoComplete="new-password" className="admin-input" maxLength={128} minLength={12} name="password" required type="password" /></label></AccountForm> : <Link className="admin-button" href="/login">Ir a ingresar</Link>}
  </AccountShell>;
}
