import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { isAdminSession } from '@/lib/auth/require-admin';
import { listOrders } from '@/lib/farmz3d/admin-data';
import AdminNav from '../_components/AdminNav';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Painel Farmz3D',
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminSession())) {
    return (
      <main className="grid min-h-screen place-items-center bg-black px-6 text-white">
        <div className="max-w-md rounded-[34px] border border-zinc-800 bg-zinc-950/80 p-8">
          <ShieldCheck className="h-10 w-10 text-amber-200" />
          <h1 className="mt-6 text-3xl font-semibold">Painel protegido</h1>
          <p className="mt-3 text-zinc-400">Entre com o usuário e a senha do painel.</p>
          <Link href="/admin/login" className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-bold text-black">
            Ir para login
          </Link>
        </div>
      </main>
    );
  }

  const { orders } = await listOrders({ status: 'new', limit: 100 });

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 lg:grid-cols-[230px_1fr] lg:px-6">
        <aside>
          <AdminNav newCount={orders.length} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
