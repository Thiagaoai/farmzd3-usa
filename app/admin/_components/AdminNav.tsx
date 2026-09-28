'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Boxes, ExternalLink, LayoutDashboard, LogOut, MessagesSquare, Package, Scale } from 'lucide-react';
import { useDecider } from './AdminClient';

const LINKS = [
  { href: '/admin', label: 'Visão geral', icon: LayoutDashboard, exact: true },
  { href: '/admin/pedidos', label: 'Pedidos', icon: Package },
  { href: '/admin/produtos', label: 'Produtos e estoque', icon: Boxes },
  { href: '/admin/mensagens', label: 'Comunicação', icon: MessagesSquare },
  { href: '/admin/decisoes', label: 'Preços e decisões', icon: Scale },
];

export default function AdminNav({ newCount }: { newCount: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [actor, setActor] = useDecider();

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <nav className="flex flex-col gap-1 lg:sticky lg:top-6">
      <Link href="/admin" className="mb-5 px-3 text-lg font-semibold tracking-[0.18em]">
        FARMZ<span className="text-[#8EA3FF]">3D</span>
        <span className="ml-2 align-middle text-[10px] font-bold tracking-[0.2em] text-zinc-500">PAINEL</span>
      </Link>
      <div className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                active ? 'bg-white text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {href === '/admin/pedidos' && newCount > 0 && (
                <span className={`ml-auto rounded-full px-2 text-[11px] font-black ${active ? 'bg-black text-white' : 'bg-cyan-300 text-black'}`}>{newCount}</span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 hidden border-t border-white/10 pt-4 lg:block">
        <p className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Quem está usando</p>
        <div className="mt-2 flex gap-1 px-2">
          {(['bruna', 'thiago'] as const).map((person) => (
            <button
              key={person}
              type="button"
              onClick={() => setActor(person)}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold capitalize ${actor === person ? 'bg-white text-black' : 'bg-white/5 text-zinc-400'}`}
            >
              {person}
            </button>
          ))}
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-zinc-400 hover:text-white">
          <ExternalLink className="h-4 w-4" /> Ver loja
        </a>
        <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm text-zinc-400 hover:text-white">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </nav>
  );
}
