import { isIP } from "node:net";
import { z } from "zod";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const machineRefSchema = z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);

export function isExternalImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/\.$/, "");
    return url.protocol === "https:"
      && !url.username && !url.password && !url.hash
      && (!url.port || url.port === "443")
      && host.includes(".") && !isIP(host.replace(/^\[|\]$/g, ""))
      && !/(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host)
      && /\.(jpe?g|png|webp)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

export const imageUrlSchema = z.string().trim().max(2048).refine(isExternalImageUrl, {
  message: "Usá una URL HTTPS pública que termine en .jpg, .jpeg, .png o .webp, sin credenciales.",
});

export const presentationSchema = z.object({
  machineRef: machineRefSchema,
  displayNameOverride: z.string().trim().max(160).transform((value) => value || null),
  shortDescription: z.string().trim().max(1000).transform((value) => value || null),
});

export const imageMetadataSchema = z.object({
  machineRef: machineRefSchema,
  alt: z.string().trim().min(1, "Describí el contenido de la imagen.").max(240),
});

export const externalImageSchema = imageMetadataSchema.extend({ url: imageUrlSchema });
export const imageActionSchema = z.object({
  machineRef: machineRefSchema,
  imageId: z.string().min(1).max(100),
});
export const imageOrderSchema = imageActionSchema.extend({ position: z.coerce.number().int().min(1) });

export function inspectImage(bytes: Uint8Array): { mimeType: string; extension: string; sizeBytes: number } {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
    throw new Error("La imagen debe pesar entre 1 byte y 5 MiB.");
  }

  const data = Buffer.from(bytes);
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mimeType: "image/png", extension: "png", sizeBytes: data.length };
  }
  if (data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255) {
    return { mimeType: "image/jpeg", extension: "jpg", sizeBytes: data.length };
  }
  if (data.length >= 16 && data.toString("ascii", 0, 4) === "RIFF"
    && data.toString("ascii", 8, 12) === "WEBP"
    && ["VP8 ", "VP8L", "VP8X"].includes(data.toString("ascii", 12, 16))) {
    return { mimeType: "image/webp", extension: "webp", sizeBytes: data.length };
  }
  throw new Error("El contenido del archivo debe ser JPEG, PNG o WEBP. No se admiten SVG.");
}

export function moveImage(ids: readonly string[], imageId: string, position: number): string[] {
  if (!ids.includes(imageId) || !Number.isInteger(position) || position < 1 || position > ids.length) {
    throw new Error("La imagen o la posición solicitada no es válida.");
  }
  const reordered = ids.filter((id) => id !== imageId);
  reordered.splice(position - 1, 0, imageId);
  return reordered;
}
