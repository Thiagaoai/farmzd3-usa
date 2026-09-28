import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { actorName } from '@/lib/farmz3d/admin-actor';
import { isFarmz3dAdminRequest } from '@/lib/farmz3d/admin-auth';
import { getOrder } from '@/lib/farmz3d/admin-data';
import { logOrderMessage, sendCustomerEmail } from '@/lib/farmz3d/messages';

export const runtime = 'nodejs';

const MessageSchema = z.object({
  channel: z.enum(['email', 'note', 'whatsapp']),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1, 'Escreva a mensagem.').max(8000),
  author: z.enum(['thiago', 'bruna']).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  if (!isFarmz3dAdminRequest(request)) return NextResponse.json({ ok: false, message: 'Não autorizado.' }, { status: 401 });

  const { orderNumber } = await params;
  const order = await getOrder(orderNumber);
  if (!order) return NextResponse.json({ ok: false, message: 'Pedido não encontrado.' }, { status: 404 });

  const parsed = MessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  const { channel, subject, body } = parsed.data;
  const author = actorName(parsed.data.author);

  if (channel === 'email') {
    if (!subject) return NextResponse.json({ ok: false, message: 'Escreva o assunto.' }, { status: 400 });
    const result = await sendCustomerEmail({ orderNumber, to: order.customer_email, subject, body, author });
    if (!result.ok) return NextResponse.json({ ok: false, message: `Email não enviado: ${result.message}` }, { status: 502 });
  } else {
    // WhatsApp is opened in the browser (wa.me); here we only keep the record.
    const result = await logOrderMessage({
      orderNumber,
      channel,
      direction: channel === 'note' ? 'internal' : 'out',
      subject: null,
      body,
      author,
    });
    if (!result.ok) return NextResponse.json({ ok: false, message: 'Não foi possível salvar.' }, { status: 500 });
  }

  revalidatePath(`/admin/pedidos/${orderNumber}`);
  return NextResponse.json({ ok: true });
}
