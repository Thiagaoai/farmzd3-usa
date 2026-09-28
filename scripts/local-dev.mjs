// Runs the Farmz3D store and admin panel locally with zero setup:
//   npm run local
// Orders, images, decisions and positions are saved to .data/ (development only).
// Real values in .env.local (e.g. Supabase, Resend, TYPESAFE_API_KEY) take precedence.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const port = process.env.PORT || '3002';

const defaults = {
  LOCAL_DEMO_DB: '1',
  ADMIN_DASHBOARD_USER: 'admin',
  ADMIN_DASHBOARD_PASSWORD: 'farmz3d-local',
  ADMIN_DASHBOARD_TOKEN: 'local-dev-session',
  ADMIN_API_TOKEN: 'local-dev-api',
  FARMZ3D_ORDERS_EMAIL: 'orders@localhost.invalid',
};
// Keys set in .env.local win over the defaults (Next.js loads that file itself, but it never
// overrides a variable that is already set, so a default must not be set for those keys).
const envLocalKeys = new Set(
  existsSync('.env.local')
    ? readFileSync('.env.local', 'utf8')
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1])
        .filter(Boolean)
    : [],
);
for (const key of Object.keys(defaults)) if (envLocalKeys.has(key)) delete defaults[key];
// With a real database in .env.local, the local JSON database stays off.
if (envLocalKeys.has('NEXT_PUBLIC_SUPABASE_URL')) delete defaults.LOCAL_DEMO_DB;

const env = { ...defaults, ...process.env };
const adminUser = env.ADMIN_DASHBOARD_USER ?? '(definido no .env.local)';
const adminPassword = defaults.ADMIN_DASHBOARD_PASSWORD ?? '(a do .env.local)';

console.log(`
  Farmz3D — local
  ─────────────────────────────────────────────
  Loja:                http://localhost:${port}
  Painel:              http://localhost:${port}/admin/login
                       usuário: ${adminUser}   senha: ${adminPassword}
  Banco local:         .data/local-db.json ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '(ignorado: Supabase real configurado)' : ''}
  Jev (TypeSafe):      ${env.TYPESAFE_API_KEY ? 'ligado' : 'desligado — defina TYPESAFE_API_KEY em .env.local para ativar'}
`);

const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '-p', port, '--hostname', 'localhost'], {
  env,
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 0));
