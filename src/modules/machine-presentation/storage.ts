import "server-only";

import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";

import { imageUrlSchema, inspectImage } from "./validation";

const storageConfigSchema = z.object({
  endpoint: z.url().refine((value) => new URL(value).protocol === "https:"),
  region: z.string().trim().min(1),
  bucket: z.string().trim().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  publicUrl: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
  }),
});

function readStorageConfig() {
  const values = {
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
    region: process.env.OBJECT_STORAGE_REGION,
    bucket: process.env.OBJECT_STORAGE_BUCKET,
    accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY,
    publicUrl: process.env.OBJECT_STORAGE_PUBLIC_URL,
  };
  return { values, parsed: storageConfigSchema.safeParse(values) };
}

export function getStorageAvailability(): "available" | "disabled" | "misconfigured" {
  const { values, parsed } = readStorageConfig();
  if (parsed.success) return "available";
  return Object.values(values).some(Boolean) ? "misconfigured" : "disabled";
}

// URLs supplied by users are never fetched. Only validated file bytes reach the configured bucket.
export async function storeImage(bytes: Uint8Array) {
  const { parsed } = readStorageConfig();
  if (!parsed.success) throw new Error("El almacenamiento de imágenes no está configurado correctamente.");
  const config = parsed.data;
  const metadata = inspectImage(bytes);
  const key = `machine-images/${randomUUID()}.${metadata.extension}`;
  const url = imageUrlSchema.parse(`${config.publicUrl.replace(/\/+$/, "")}/${key}`);
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  try {
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: bytes,
      ContentType: metadata.mimeType,
      ContentLength: metadata.sizeBytes,
      ContentDisposition: "inline",
      CacheControl: "public, max-age=31536000, immutable",
    }));
  } finally {
    client.destroy();
  }
  return { url, mimeType: metadata.mimeType, sizeBytes: metadata.sizeBytes };
}
