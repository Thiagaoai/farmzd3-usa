import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'Login — Painel Farmz3D',
  robots: {
    index: false,
    follow: false,
  },
};

// Local demo only (npm run local): show the built-in credentials so nobody tries the production password.
function localHint() {
  if (process.env.NODE_ENV === 'production' || process.env.LOCAL_DEMO_DB !== '1') return null;
  if (process.env.ADMIN_DASHBOARD_USER !== 'admin' || process.env.ADMIN_DASHBOARD_PASSWORD !== 'farmz3d-local') return null;
  return 'Modo local: usuário admin · senha farmz3d-local (a senha do site farmz3d.shop não vale aqui).';
}

export default function AdminLoginPage() {
  const hint = localHint();
  return (
    <main className="min-h-screen overflow-hidden bg-black px-6 py-10 text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-180px] h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[130px]" />
        <div className="absolute bottom-[-220px] right-[-160px] h-[520px] w-[520px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col">
        <Link href="/" className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_440px]">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">
              Farmz3D · Painel
            </p>
            <h2 className="max-w-3xl text-[46px] font-semibold leading-[1.04] sm:text-[76px]">
              Pedidos, preços e decisões da Farmz3D.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-400">
              Acesso privado do Thiago e da Bruna: pedidos, imagens dos clientes, WhatsApp e aprovação de preços.
            </p>
          </div>

          <div className="grid gap-3">
            {hint && <p className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{hint}</p>}
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
