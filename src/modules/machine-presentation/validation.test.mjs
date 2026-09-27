import assert from "node:assert/strict";
import test from "node:test";

import { externalImageSchema, inspectImage, isExternalImageUrl, MAX_IMAGE_BYTES, moveImage } from "./validation.ts";

test("image URLs allow HTTPS image paths but reject credentials, internal hosts and active formats", () => {
  assert.ok(isExternalImageUrl("https://images.vendor.com/equipment/lathe.webp"));
  for (const url of [
    "http://images.vendor.com/a.jpg", "https://localhost/a.png", "https://127.0.0.1/a.jpg",
    "https://[::1]/a.png", "https://equipment.internal/a.png", "https://user:secret@vendor.com/a.jpg",
    "https://vendor.com/a.svg", "https://vendor.com/a.png#x", "data:image/png;base64,a", "https://vendor.com:8443/a.png",
  ]) assert.equal(isExternalImageUrl(url), false, url);
  assert.equal(externalImageSchema.safeParse({ machineRef: "M-01", alt: "", url: "https://vendor.com/a.jpg" }).success, false);
});

test("uploads derive MIME from file bytes and reject SVG, disguised files and oversized data", () => {
  assert.equal(inspectImage(Uint8Array.from([255, 216, 255, 224])).mimeType, "image/jpeg");
  assert.equal(inspectImage(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])).mimeType, "image/png");
  assert.equal(inspectImage(Buffer.from("RIFFxxxxWEBPVP8 ")).mimeType, "image/webp");
  assert.throws(() => inspectImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")));
  assert.throws(() => inspectImage(Buffer.from("not a JPEG")));
  assert.throws(() => inspectImage(new Uint8Array(MAX_IMAGE_BYTES + 1)));
});

test("gallery reordering preserves all images and rejects unknown images and positions", () => {
  assert.deepEqual(moveImage(["a", "b", "c"], "c", 1), ["c", "a", "b"]);
  assert.deepEqual(moveImage(["a", "b", "c"], "a", 3), ["b", "c", "a"]);
  assert.throws(() => moveImage(["a"], "missing", 1));
  assert.throws(() => moveImage(["a", "b"], "a", 0));
  assert.throws(() => moveImage(["a", "b"], "a", 3));
});
