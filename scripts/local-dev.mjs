// Runs the Farmz3D store and admin panel locally with zero setup:
//   npm run local
// Orders, images, decisions and positions are saved to .data/ (development only).
// Real values in .env.local (e.g. Supabase, Resend, TYPESAFE_API_KEY) take precedence.
import { spawn } from 'node:child_process';
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
const env = { ...defaults, ...process.env };

console.log(`
  Farmz3D — local
  ─────────────────────────────────────────────
  Loja:                http://localhost:${port}
  Painel:              http://localhost:${port}/admin/login
                       usuário: ${env.ADMIN_DASHBOARD_USER}   senha: ${env.ADMIN_DASHBOARD_PASSWORD}
  Banco local:         .data/local-db.json ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '(ignorado: Supabase real configurado)' : ''}
  Jev (TypeSafe):      ${env.TYPESAFE_API_KEY ? 'ligado' : 'desligado — defina TYPESAFE_API_KEY em .env.local para ativar'}
`);

const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '-p', port, '--hostname', 'localhost'], {
  env,
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 0));
