import "server-only";

import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { machines } from "@/features/maintenance/mock-data";
import { audit } from "@/modules/identity/audit";
import { getActor } from "@/modules/identity/auth";
import type { Db } from "@/modules/identity/db";
import { can, type Actor } from "@/modules/identity/policy";
import { getResourceContext } from "@/modules/identity/resources";
import { getStorageAvailability, storeImage } from "./storage";
import type { PresentationImage, PresentationView } from "./types";
import {
  externalImageSchema, imageActionSchema, imageMetadataSchema, imageOrderSchema,
  inspectImage, isExternalImageUrl, machineRefSchema, MAX_IMAGE_BYTES, moveImage, presentationSchema,
} from "./validation";

export class PresentationError extends Error {}

const imageSelect = { id: true, url: true, alt: true, isPrimary: true, sortOrder: true } as const;
const imageOrder = [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }] as const;

async function authorizedMachines(actor: Actor, machineRefs: readonly string[], permission: string, db: Db) {
  const refs = z.array(machineRefSchema).parse(machineRefs);
  const fresh = await getActor(db, actor.id);
  const registered = await db.accessResource.findMany({
    where: { scopeType: "MACHINE", scopeRef: { in: refs } }, select: { scopeRef: true },
  });
  const known = machines.filter((machine) => registered.some((resource) => resource.scopeRef === machine.id));
  const authorized = [];
  for (const machine of known) {
    const context = await getResourceContext("MACHINE", machine.id, db);
    if (can(fresh, "machines.view", context) && can(fresh, permission, context)) {
      authorized.push({
        machine,
        canUpdatePresentation: can(fresh, "machines.presentation.update", context),
        canUpdateImages: can(fresh, "machines.images.update", context),
      });
    }
  }
  return authorized;
}

async function readPresentations(db: Db, machineRefs: readonly string[]): Promise<PresentationView[]> {
  const records = await db.machinePresentation.findMany({
    where: { machineRef: { in: [...machineRefs] } },
    select: {
      machineRef: true, displayNameOverride: true, shortDescription: true,
      images: { select: imageSelect, orderBy: [...imageOrder] },
    },
  });
  return machineRefs.map((machineRef) => {
    const record = records.find((item) => item.machineRef === machineRef);
    return {
      machineRef,
      displayNameOverride: record?.displayNameOverride ?? null,
      shortDescription: record?.shortDescription ?? null,
      images: record?.images.filter((image) => isExternalImageUrl(image.url)) ?? [],
    };
  });
}

export async function getMachinePresentations(actor: Actor, machineRefs: readonly string[]): Promise<PresentationView[]> {
  const db = getPrisma();
  const allowed = await authorizedMachines(actor, machineRefs, "machines.view", db);
  return readPresentations(db, allowed.map(({ machine }) => machine.id));
}

export async function getAdminMachines(actor: Actor) {
  const db = getPrisma();
  const allowed = await authorizedMachines(actor, machines.map((machine) => machine.id), "machines.list", db);
  const presentations = await readPresentations(db, allowed.map(({ machine }) => machine.id));
  return allowed.map((item, index) => ({ ...item, presentation: presentations[index] }));
}

export async function getAdminMachine(actor: Actor, rawRef: unknown) {
  const parsed = machineRefSchema.safeParse(rawRef);
  if (!parsed.success) return null;
  const records = await getAdminMachines(actor);
  const record = records.find(({ machine }) => machine.id === parsed.data);
  return record ? { ...record, storageAvailability: getStorageAvailability() } : null;
}

async function requireMachinePermission(db: Db, actor: Actor, machineRef: string, permission: string) {
  if (!machines.some((machine) => machine.id === machineRef)) throw new PresentationError("El equipo no está disponible.");
  const fresh = await getActor(db, actor.id);
  const context = await getResourceContext("MACHINE", machineRef, db);
  if (!can(fresh, "machines.view", context) || !can(fresh, permission, context)) {
    throw new PresentationError("No tenés permiso para modificar la presentación de este equipo.");
  }
}

async function mutate<T>(actor: Actor, machineRef: string, permission: string, operation: (db: Db) => Promise<T>) {
  return getPrisma().$transaction(async (db) => {
    await requireMachinePermission(db, actor, machineRefSchema.parse(machineRef), permission);
    return operation(db);
  }, { isolationLevel: "Serializable" });
}

function ensurePresentation(db: Db, actor: Actor, machineRef: string) {
  return db.machinePresentation.upsert({
    where: { machineRef },
    create: { machineRef, updatedByUserId: actor.id },
    update: { updatedByUserId: actor.id },
  });
}

export async function updatePresentation(actor: Actor, input: unknown) {
  const data = presentationSchema.parse(input);
  return mutate(actor, data.machineRef, "machines.presentation.update", async (db) => {
    const before = await db.machinePresentation.findUnique({ where: { machineRef: data.machineRef } });
    const after = await db.machinePresentation.upsert({
      where: { machineRef: data.machineRef },
      create: { ...data, updatedByUserId: actor.id },
      update: { displayNameOverride: data.displayNameOverride, shortDescription: data.shortDescription, updatedByUserId: actor.id },
    });
    await audit(db, {
      actorUserId: actor.id, action: "MACHINE_PRESENTATION_UPDATED", entityType: "MachinePresentation", entityId: after.id,
      scopeType: "MACHINE", scopeRef: data.machineRef,
      beforeData: { displayNameOverride: before?.displayNameOverride ?? null, shortDescription: before?.shortDescription ?? null },
      afterData: { displayNameOverride: after.displayNameOverride, shortDescription: after.shortDescription },
    });
  });
}

async function addImage(actor: Actor, data: { machineRef: string; url: string; alt: string; mimeType?: string; sizeBytes?: number }) {
  return mutate(actor, data.machineRef, "machines.images.update", async (db) => {
    const presentation = await ensurePresentation(db, actor, data.machineRef);
    const last = await db.machineImage.findFirst({
      where: { machinePresentationId: presentation.id }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true },
    });
    const image = await db.machineImage.create({
      data: {
        machinePresentationId: presentation.id, url: data.url, alt: data.alt,
        isPrimary: !last, sortOrder: last ? last.sortOrder + 1 : 0,
        mimeType: data.mimeType, sizeBytes: data.sizeBytes, createdByUserId: actor.id,
      }, select: imageSelect,
    });
    await audit(db, {
      actorUserId: actor.id, action: "MACHINE_IMAGE_ADDED", entityType: "MachineImage", entityId: image.id,
      scopeType: "MACHINE", scopeRef: data.machineRef, afterData: image,
    });
  });
}

export async function addExternalImage(actor: Actor, input: unknown) {
  return addImage(actor, externalImageSchema.parse(input));
}

export async function uploadMachineImage(actor: Actor, input: unknown, file: unknown) {
  const data = imageMetadataSchema.parse(input);
  if (!(file instanceof File) || !file.size || file.size > MAX_IMAGE_BYTES) {
    throw new PresentationError("Seleccioná una imagen JPEG, PNG o WEBP de hasta 5 MiB.");
  }
  await requireMachinePermission(getPrisma(), actor, data.machineRef, "machines.images.update");
  const bytes = new Uint8Array(await file.arrayBuffer());
  try { inspectImage(bytes); } catch (error) {
    throw new PresentationError(error instanceof Error ? error.message : "El archivo no es una imagen admitida.");
  }
  if (getStorageAvailability() !== "available") throw new PresentationError("El almacenamiento de imágenes no está habilitado.");
  let stored;
  try { stored = await storeImage(bytes); } catch {
    throw new PresentationError("No se pudo subir la imagen al almacenamiento. Intentá nuevamente.");
  }
  // The write rechecks current permissions after the upload; storage cleanup is independent of gallery references.
  return addImage(actor, { ...data, ...stored });
}

async function existingImage(db: Db, actor: Actor, machineRef: string, imageId: string) {
  const presentation = await db.machinePresentation.findUnique({
    where: { machineRef }, include: { images: { select: imageSelect, orderBy: [...imageOrder] } },
  });
  const image = presentation?.images.find((item) => item.id === imageId);
  if (!presentation || !image) throw new PresentationError("La imagen ya no está disponible en este equipo.");
  await db.machinePresentation.update({ where: { id: presentation.id }, data: { updatedByUserId: actor.id } });
  return { presentation, image };
}

export async function setPrimaryImage(actor: Actor, input: unknown) {
  const data = imageActionSchema.parse(input);
  return mutate(actor, data.machineRef, "machines.images.update", async (db) => {
    const { presentation, image } = await existingImage(db, actor, data.machineRef, data.imageId);
    await db.machineImage.updateMany({ where: { machinePresentationId: presentation.id }, data: { isPrimary: false } });
    await db.machineImage.update({ where: { id: image.id }, data: { isPrimary: true } });
    await audit(db, {
      actorUserId: actor.id, action: "MACHINE_PRIMARY_IMAGE_CHANGED", entityType: "MachinePresentation", entityId: presentation.id,
      scopeType: "MACHINE", scopeRef: data.machineRef,
      beforeData: { imageId: presentation.images.find((item) => item.isPrimary)?.id ?? null },
      afterData: { imageId: image.id },
    });
  });
}

export async function reorderImage(actor: Actor, input: unknown) {
  const data = imageOrderSchema.parse(input);
  return mutate(actor, data.machineRef, "machines.images.update", async (db) => {
    const { presentation } = await existingImage(db, actor, data.machineRef, data.imageId);
    const ids = presentation.images.map((image) => image.id);
    if (data.position > ids.length) throw new PresentationError("La posición supera la cantidad de imágenes.");
    const ordered = moveImage(ids, data.imageId, data.position);
    for (const [sortOrder, id] of ordered.entries()) await db.machineImage.update({ where: { id }, data: { sortOrder } });
    await audit(db, {
      actorUserId: actor.id, action: "MACHINE_IMAGE_ORDER_UPDATED", entityType: "MachinePresentation", entityId: presentation.id,
      scopeType: "MACHINE", scopeRef: data.machineRef, beforeData: { imageIds: ids }, afterData: { imageIds: ordered },
    });
  });
}

export async function removeImage(actor: Actor, input: unknown) {
  const data = imageActionSchema.extend({ confirmed: z.literal("yes", { error: "Confirmá la eliminación de la referencia." }) }).parse(input);
  return mutate(actor, data.machineRef, "machines.images.update", async (db) => {
    const { presentation, image } = await existingImage(db, actor, data.machineRef, data.imageId);
    await db.machineImage.delete({ where: { id: image.id } });
    const remaining = presentation.images.filter((item) => item.id !== image.id);
    if (image.isPrimary && remaining[0]) {
      await db.machineImage.update({ where: { id: remaining[0].id }, data: { isPrimary: true } });
    }
    await audit(db, {
      actorUserId: actor.id, action: "MACHINE_IMAGE_REMOVED", entityType: "MachineImage", entityId: image.id,
      scopeType: "MACHINE", scopeRef: data.machineRef, beforeData: image,
    });
    if (image.isPrimary) {
      await audit(db, {
        actorUserId: actor.id, action: "MACHINE_PRIMARY_IMAGE_CHANGED", entityType: "MachinePresentation", entityId: presentation.id,
        scopeType: "MACHINE", scopeRef: data.machineRef,
        beforeData: { imageId: image.id }, afterData: { imageId: remaining[0]?.id ?? null },
      });
    }
  });
}

export function primaryImage(presentation: PresentationView): PresentationImage | null {
  return presentation.images.find((image) => image.isPrimary) ?? presentation.images[0] ?? null;
}
