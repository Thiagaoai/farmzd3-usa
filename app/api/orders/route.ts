import { after, NextResponse } from 'next/server';
import { z } from 'zod';
import { OrderInputSchema } from '@/lib/farmz3d/catalog';
import { logOrderMessage } from '@/lib/farmz3d/messages';
import { MAX_ORDER_IMAGE_BYTES, readOrderImageUpload, storeOrderImage } from '@/lib/farmz3d/order-images';
import { getFarmz3dConfigStatus, getOrderableProduct, OrderRejected, saveOrder, sendOrderEmails } from '@/lib/farmz3d/orders';
import { getClientIp, isRateLimited } from '@/lib/shared/request-guard';
import { isTypeSafeConfigured } from '@/lib/typesafe/client';
import { triageOrder } from '@/lib/typesafe/order-triage';
import { saveOrderTriage } from '@/lib/typesafe/store';

export const runtime = 'nodejs';

const MIN_FORM_TIME_MS = 3000;
const MAX_ORDERS_PER_IP_PER_HOUR = 10;
// Image plus the text fields; anything bigger is rejected before reading the body.
const MAX_BODY_BYTES = MAX_ORDER_IMAGE_BYTES + 256 * 1024;

const TEXT_FIELDS = ['productId', 'quantity', 'personalization', 'neededBy', 'fulfillment', 'shippingZip', 'shipLine1', 'shipLine2', 'shipCity', 'shipState', 'name', 'email', 'phone', 'notes', 'company'] as const;

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, message: 'The image must be 8 MB or smaller.' }, { status: 413 });
  }

  // The order form sends multipart/form-data (text fields + optional reference image).
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid form data.' }, { status: 400 });
  }

  const body: Record<string, unknown> = {};
  for (const field of TEXT_FIELDS) {
    const value = form.get(field);
    if (typeof value === 'string') body[field] = value;
  }
  const startedAt = Number(form.get('startedAt'));
  if (Number.isFinite(startedAt) && startedAt > 0) body.startedAt = startedAt;

  const parsed = OrderInputSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, message: issue?.message ?? 'Invalid order.', field: issue?.path.join('.'), issues: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const order = parsed.data;
  const isBot = Boolean(order.company?.trim()) || (order.startedAt ? Date.now() - order.startedAt < MIN_FORM_TIME_MS : false);
  if (isBot) {
    return NextResponse.json({ ok: true, orderNumber: null });
  }

  if (isRateLimited(`farmz3d:${getClientIp(request)}`, MAX_ORDERS_PER_IP_PER_HOUR)) {
    return NextResponse.json({ ok: false, message: 'Too many orders from this connection. Please try again later.' }, { status: 429 });
  }

  const config = getFarmz3dConfigStatus();
  if (!config.database && !config.email) {
    return NextResponse.json(
      { ok: false, message: 'Online ordering is not available right now. Please contact us directly.' },
      { status: 503 },
    );
  }

  const upload = await readOrderImageUpload(form.get('image'));
  if (!upload.ok) return NextResponse.json({ ok: false, message: upload.message, field: 'image' }, { status: 400 });

  try {
    // Check availability before storing the image.
    await getOrderableProduct(order.productId);

    // A failed image upload does not block the order: the owner email still carries the image.
    let imagePath: string | null = null;
    if (upload.image) {
      const storedImage = await storeOrderImage(upload.image);
      if ('path' in storedImage) imagePath = storedImage.path;
      else console.error('[farmz3d] order image not stored', { error: storedImage.error });
    }

    const { saved, product, stored, storeError } = await saveOrder(order, imagePath);
    const email = config.email ? await sendOrderEmails(order, saved, upload.image) : { emailed: false as const, error: 'Email not configured.' };

    if (!stored && !email.emailed) {
      console.error('[farmz3d] order not persisted', { storeError, emailError: email.error });
      return NextResponse.json(
        { ok: false, message: 'We could not record your order. Please try again or contact us directly.' },
        { status: 503 },
      );
    }

    if (!stored) console.error('[farmz3d] order emailed but not stored', { storeError });
    if (!email.emailed && config.email) console.error('[farmz3d] order stored but email failed', { error: email.error });

    if (stored) {
      after(() =>
        logOrderMessage({
          orderNumber: saved.orderNumber,
          channel: 'system',
          direction: 'internal',
          body: `${saved.isQuote ? 'Pedido de ORÇAMENTO recebido pelo site — defina o valor em “Atualizar pedido” e envie com o modelo “Enviar orçamento”.' : 'Pedido recebido pelo site.'} ${email.emailed ? 'Emails enviados (loja e cliente).' : 'Email NÃO enviado — responda o cliente pelo painel.'}`,
        }),
      );
    }

    // Jev production check runs after the response, so the customer never waits on it.
    if (stored && isTypeSafeConfigured()) {
      after(async () => {
        const result = await triageOrder(product, order);
        if (result.ok) await saveOrderTriage(saved.orderNumber, result.triage);
        else console.error('[jev] order triage failed', { order: saved.orderNumber, error: result.error });
      });
    }

    return NextResponse.json({
      ok: true,
      orderNumber: saved.orderNumber,
      estimatedTotalCents: saved.estimatedTotalCents,
      quote: saved.isQuote,
      stored,
      emailed: email.emailed,
    });
  } catch (error) {
    if (error instanceof OrderRejected) {
      return NextResponse.json({ ok: false, message: error.message, field: 'productId' }, { status: 409 });
    }
    console.error('[farmz3d] order failed', error);
    return NextResponse.json({ ok: false, message: 'Unexpected error. Please try again.' }, { status: 500 });
  }
}
