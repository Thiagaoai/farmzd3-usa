import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isLocalDemoDbEnabled } from '@/lib/dev/local-db';
import { sniffImage } from './image-sniff';

// Reference images customers attach to an order (photo for a lithophane, logo, sketch).
// Stored in a private Supabase Storage bucket; only the admin panel and the owner email see them.
export const ORDER_IMAGE_BUCKET = 'farmz3d-order-images';
export const MAX_ORDER_IMAGE_BYTES = 8 * 1024 * 1024;

const LOCAL_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), '.data', 'order-images');

export type OrderImage = { bytes: Uint8Array; contentType: string; ext: string; originalName: string };

export async function readOrderImageUpload(value: FormDataEntryValue | null) {
  if (!value || typeof value === 'string' || value.size === 0) return { ok: true as const, image: null };
  if (value.size > MAX_ORDER_IMAGE_BYTES) return { ok: false as const, message: 'The image must be 8 MB or smaller.' };

  const bytes = new Uint8Array(await value.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false as const, message: 'Please upload a JPG, PNG, WebP or HEIC image.' };

  const originalName = value.name.replace(/[^\w.\- ]+/g, '').slice(0, 80) || `image.${kind.ext}`;
  return { ok: true as const, image: { bytes, ...kind, originalName } satisfies OrderImage };
}

function usesLocalFiles() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL && isLocalDemoDbEnabled();
}

// Returns the storage path, or an error. The key is random so it cannot be guessed from the order number.
export async function storeOrderImage(image: OrderImage): Promise<{ path: string } | { error: string }> {
  const key = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${image.ext}`;

  if (usesLocalFiles()) {
    const file = path.join(LOCAL_DIR, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, image.bytes);
    return { path: key };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: 'Supabase not configured.' };

  const { error } = await supabase.storage
    .from(ORDER_IMAGE_BUCKET)
    .upload(key, image.bytes, { contentType: image.contentType, upsert: false });
  return error ? { error: error.message } : { path: key };
}

const SAFE_KEY = /^\d{4}-\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp|heic)$/;
const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' };

export async function loadOrderImage(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!SAFE_KEY.test(key)) return null;
  const contentType = TYPES[key.split('.').pop() ?? ''];

  if (usesLocalFiles()) {
    try {
      return { bytes: new Uint8Array(await readFile(path.join(LOCAL_DIR, key))), contentType };
    } catch {
      return null;
    }
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(ORDER_IMAGE_BUCKET).download(key);
  if (error || !data) return null;
  return { bytes: new Uint8Array(await data.arrayBuffer()), contentType };
}
