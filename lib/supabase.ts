import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isLocalDemoDbEnabled, localDemoFetch } from '@/lib/dev/local-db';

let cachedAdmin: SupabaseClient | null | undefined;

export function getSupabaseAdmin() {
  if (cachedAdmin !== undefined) return cachedAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    // Development only: LOCAL_DEMO_DB=1 runs the app against a local JSON file (see lib/dev/local-db.ts).
    cachedAdmin = isLocalDemoDbEnabled()
      ? createClient('http://local-demo-db.invalid', 'local-demo', {
          auth: { autoRefreshToken: false, persistSession: false },
          global: { fetch: localDemoFetch },
        })
      : null;
    return cachedAdmin;
  }

  cachedAdmin = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdmin;
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
