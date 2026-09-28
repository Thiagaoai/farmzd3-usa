import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isLocalDemoDbEnabled } from '@/lib/dev/local-db';
import { getSupabaseAdmin } from '@/lib/supabase';

// Private Supabase Storage buckets, or .data/<bucket>/ in local demo mode.
// Files are always served through the app, never by public bucket URLs.

const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' };
export const SAFE_KEY = /^\d{4}-\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp|heic)$/;

function usesLocalFiles() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL && isLocalDemoDbEnabled();
}

function localPath(bucket: string, key: string) {
  return path.join(/* turbopackIgnore: true */ process.cwd(), '.data', bucket, key);
}

export async function putObject(bucket: string, key: string, bytes: Uint8Array, contentType: string): Promise<{ error?: string }> {
  if (usesLocalFiles()) {
    const file = localPath(bucket, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
    return {};
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: 'Supabase not configured.' };
  const { error } = await supabase.storage.from(bucket).upload(key, bytes, { contentType, upsert: false });
  return error ? { error: error.message } : {};
}

export async function getObject(bucket: string, key: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!SAFE_KEY.test(key)) return null;
  const contentType = TYPES[key.split('.').pop() ?? ''];

  if (usesLocalFiles()) {
    try {
      return { bytes: new Uint8Array(await readFile(localPath(bucket, key))), contentType };
    } catch {
      return null;
    }
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(bucket).download(key);
  if (error || !data) return null;
  return { bytes: new Uint8Array(await data.arrayBuffer()), contentType };
}

export async function deleteObject(bucket: string, key: string) {
  if (!SAFE_KEY.test(key)) return;
  if (usesLocalFiles()) {
    await rm(localPath(bucket, key), { force: true });
    return;
  }
  await getSupabaseAdmin()?.storage.from(bucket).remove([key]);
}

export function newObjectKey(ext: string) {
  return `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
}
