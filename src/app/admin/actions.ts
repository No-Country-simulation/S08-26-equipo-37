"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireAuthenticatedUser } from "@/modules/identity/auth";
import { AdminError, createUser, deleteRole, revokeAssignment, saveAssignment, saveResource, saveRole, updateUser, userCommand, type AdminResult } from "@/modules/admin/service";
import type { AdminActionState } from "@/app/_components/admin-form";

async function run(data: FormData, mutation: (actorId: string, input: unknown) => Promise<AdminResult>): Promise<AdminActionState> {
  const actor = await requireAuthenticatedUser();
  try {
    const result = await mutation(actor.id, { ...Object.fromEntries(data), permissionKeys: data.getAll("permissionKeys") });
    revalidatePath("/admin", "layout");
    revalidatePath("/profile");
    revalidatePath("/");
    return result;
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Revisá los campos del formulario." };
    if (error instanceof AdminError) return { error: error.message };
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2002") return { error: "Ya existe un registro con ese email, nombre o referencia." };
      if (error.code === "P2034") return { error: "Otro administrador modificó estos datos. Actualizá la página y volvé a intentarlo." };
    }
    return { error: "No se pudo completar la operación. Actualizá la página y volvé a intentarlo." };
  }
}

export async function createUserAction(_previous: AdminActionState, data: FormData) { return run(data, createUser); }
export async function updateUserAction(_previous: AdminActionState, data: FormData) { return run(data, updateUser); }
export async function userCommandAction(_previous: AdminActionState, data: FormData) { return run(data, userCommand); }
export async function saveAssignmentAction(_previous: AdminActionState, data: FormData) { return run(data, saveAssignment); }
export async function revokeAssignmentAction(_previous: AdminActionState, data: FormData) { return run(data, revokeAssignment); }
export async function saveRoleAction(_previous: AdminActionState, data: FormData) { return run(data, saveRole); }
export async function deleteRoleAction(_previous: AdminActionState, data: FormData) {
  const state = await run(data, deleteRole);
  if (state.success) redirect("/admin/roles");
  return state;
}
export async function saveResourceAction(_previous: AdminActionState, data: FormData) { return run(data, saveResource); }
