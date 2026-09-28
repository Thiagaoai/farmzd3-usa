import { sniffImage } from './image-sniff';
import { getObject, newObjectKey, putObject } from './storage';

// Reference images customers attach to an order (photo for a lithophane, logo, sketch).
// Stored in a private Supabase Storage bucket; only the admin panel and the owner email see them.
export const ORDER_IMAGE_BUCKET = 'farmz3d-order-images';
export const MAX_ORDER_IMAGE_BYTES = 8 * 1024 * 1024;

export type OrderImage = { bytes: Uint8Array; contentType: string; ext: string; originalName: string };

export async function readOrderImageUpload(value: FormDataEntryValue | null, allowHeic = true) {
  if (!value || typeof value === 'string' || value.size === 0) return { ok: true as const, image: null };
  if (value.size > MAX_ORDER_IMAGE_BYTES) return { ok: false as const, message: 'The image must be 8 MB or smaller.' };

  const bytes = new Uint8Array(await value.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind || (!allowHeic && kind.ext === 'heic')) {
    return { ok: false as const, message: allowHeic ? 'Please upload a JPG, PNG, WebP or HEIC image.' : 'Use uma imagem JPG, PNG ou WebP.' };
  }

  const originalName = value.name.replace(/[^\w.\- ]+/g, '').slice(0, 80) || `image.${kind.ext}`;
  return { ok: true as const, image: { bytes, ...kind, originalName } satisfies OrderImage };
}

// Returns the storage path, or an error. The key is random so it cannot be guessed from the order number.
export async function storeOrderImage(image: OrderImage): Promise<{ path: string } | { error: string }> {
  const key = newObjectKey(image.ext);
  const { error } = await putObject(ORDER_IMAGE_BUCKET, key, image.bytes, image.contentType);
  return error ? { error } : { path: key };
}

export function loadOrderImage(key: string) {
  return getObject(ORDER_IMAGE_BUCKET, key);
}
