"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AdminActionState } from "@/app/_components/admin-form";
import { requireAuthenticatedUser } from "@/modules/identity/auth";
import type { Actor } from "@/modules/identity/policy";
import {
  addExternalImage, PresentationError, removeImage, reorderImage, setPrimaryImage,
  updatePresentation, uploadMachineImage,
} from "./service";
import { machineRefSchema } from "./validation";

async function runAction(formData: FormData, operation: (actor: Actor, input: Record<string, FormDataEntryValue>) => Promise<unknown>): Promise<AdminActionState> {
  const actor = await requireAuthenticatedUser();
  const input = Object.fromEntries(formData);
  try {
    await operation(actor, input);
    const machineRef = machineRefSchema.parse(input.machineRef);
    revalidatePath("/");
    revalidatePath("/admin/machines");
    revalidatePath(`/admin/machines/${machineRef}`);
    revalidatePath(`/machines/${machineRef}`);
    return { success: "Cambios guardados." };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues[0]?.message ?? "Revisá los datos ingresados." };
    if (error instanceof PresentationError) return { error: error.message };
    return { error: "No se pudieron guardar los cambios. Verificá tu acceso y volvé a intentar." };
  }
}

export async function savePresentationAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  return runAction(formData, updatePresentation);
}

export async function addExternalImageAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  return runAction(formData, addExternalImage);
}

export async function uploadImageAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  return runAction(formData, (actor, input) => uploadMachineImage(actor, input, formData.get("file")));
}

export async function setPrimaryImageAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  return runAction(formData, setPrimaryImage);
}

export async function reorderImageAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  return runAction(formData, reorderImage);
}

export async function removeImageAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  return runAction(formData, removeImage);
}
