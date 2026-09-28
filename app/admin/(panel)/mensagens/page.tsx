import Link from 'next/link';
import { ExternalLink, Mail, MessageCircle } from 'lucide-react';
import { FARMZ3D_WHATSAPP, formatUsPhone } from '@/lib/farmz3d/contact';
import { listRecentMessages } from '@/lib/farmz3d/messages';
import { Card, formatWhen, gmailSearchUrl, PageHeader } from '../../_components/ui';

const LABEL = { email: 'Email', whatsapp: 'WhatsApp', note: 'Nota', system: 'Sistema' } as const;

export default async function MessagesPage() {
  const messages = await listRecentMessages(100);
  const ordersEmail = process.env.FARMZ3D_ORDERS_EMAIL;

  return (
    <div>
      <PageHeader title="Comunicação" subtitle="Tudo o que foi enviado aos clientes pelo painel. As respostas dos clientes chegam no Gmail e no WhatsApp da Bruna." />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <a href={gmailSearchUrl('Farmz3D order')} target="_blank" rel="noopener noreferrer" className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 hover:border-white/25">
          <Mail className="h-5 w-5 text-cyan-300" />
          <p className="mt-3 font-semibold">Caixa de emails dos pedidos</p>
          <p className="mt-1 text-xs text-zinc-500">{ordersEmail ?? 'FARMZ3D_ORDERS_EMAIL'} · abre o Gmail filtrado ↗</p>
        </a>
        <a href="https://web.whatsapp.com/" target="_blank" rel="noopener noreferrer" className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 hover:border-white/25">
          <MessageCircle className="h-5 w-5 text-emerald-300" />
          <p className="mt-3 font-semibold">WhatsApp Web</p>
          <p className="mt-1 text-xs text-zinc-500">{formatUsPhone(FARMZ3D_WHATSAPP)} · abre as conversas ↗</p>
        </a>
        <a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer" className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5 hover:border-white/25">
          <ExternalLink className="h-5 w-5 text-violet-300" />
          <p className="mt-3 font-semibold">Entregas de email (Resend)</p>
          <p className="mt-1 text-xs text-zinc-500">Confira se cada email foi entregue ↗</p>
        </a>
      </div>

      <Card title="Histórico de mensagens">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma mensagem enviada pelo painel ainda. Abra um pedido e use “Falar com o cliente”.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {messages.map((message) => (
              <li key={message.id}>
                <Link href={`/admin/pedidos/${message.order_number}`} className="grid gap-1 py-3 hover:bg-white/[0.02] sm:grid-cols-[170px_110px_1fr_150px]">
                  <span className="font-mono text-sm text-cyan-200">{message.order_number}</span>
                  <span className="text-xs font-bold uppercase text-zinc-400">{LABEL[message.channel]}</span>
                  <span className="min-w-0 truncate text-sm text-zinc-300">{message.subject ? `${message.subject} — ` : ''}{message.body}</span>
                  <span className="text-xs text-zinc-500 sm:text-right">
                    {message.author ? `${message.author} · ` : ''}
                    {formatWhen(message.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
