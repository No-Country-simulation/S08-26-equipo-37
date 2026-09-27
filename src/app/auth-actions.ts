"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { after } from "next/server";
import { ZodError } from "zod";
import type { AccountFormState } from "./_components/account-form";
import { createSession, destroySession, requireAuthenticatedUser } from "@/modules/identity/auth";
import { authenticate, changePassword, consumeAccountToken, requestPasswordReset } from "@/modules/identity/service";
import { sendAccountMail } from "@/modules/identity/mail";

function controlledError(error: unknown): AccountFormState {
  unstable_rethrow(error);
  if (error instanceof ZodError) return { error: "Revisá los datos. La contraseña nueva requiere entre 12 y 128 caracteres." };
  const allowed = ["Demasiados intentos. Esperá 15 minutos.", "Email o contraseña incorrectos.", "El enlace venció o ya fue utilizado.", "El enlace ya fue utilizado.", "La invitación ya no está disponible.", "Elegí una contraseña diferente de la actual.", "La contraseña actual es incorrecta."];
  return { error: error instanceof Error && allowed.includes(error.message) ? error.message : "No se pudo completar la operación. Volvé a intentarlo." };
}

export async function loginAction(_state: AccountFormState, form: FormData): Promise<AccountFormState> {
  let mustChangePassword: boolean;
  try {
    const user = await authenticate(form.get("email"), form.get("password"));
    await createSession(user.id, user.verifiedPasswordHash);
    mustChangePassword = user.mustChangePassword;
  } catch (error) { return controlledError(error); }
  redirect(mustChangePassword ? "/profile?password=required" : "/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(_state: AccountFormState, form: FormData): Promise<AccountFormState> {
  try {
    const result = await requestPasswordReset(form.get("email"));
    if (result) after(async () => {
      try { await sendAccountMail(result.email, "reset", result.link); }
      catch { console.error("Account email delivery failed; check SMTP configuration."); }
    });
  } catch (error) { unstable_rethrow(error); }
  return { success: "Si la dirección tiene una cuenta activa, recibirá un enlace de recuperación. Si no llega, contactá a la administración." };
}

export async function acceptInvitationAction(_state: AccountFormState, form: FormData): Promise<AccountFormState> {
  try { await consumeAccountToken("invitation", form.get("token"), form.get("password")); }
  catch (error) { return controlledError(error); }
  await destroySession();
  redirect("/login?updated=1");
}

export async function resetPasswordAction(_state: AccountFormState, form: FormData): Promise<AccountFormState> {
  try { await consumeAccountToken("reset", form.get("token"), form.get("password")); }
  catch (error) { return controlledError(error); }
  await destroySession();
  redirect("/login?updated=1");
}

export async function changePasswordAction(_state: AccountFormState, form: FormData): Promise<AccountFormState> {
  const user = await requireAuthenticatedUser({ allowPasswordChange: true });
  try { await changePassword(user.id, form.get("currentPassword"), form.get("password")); }
  catch (error) { return controlledError(error); }
  await destroySession();
  redirect("/login?updated=1");
}
