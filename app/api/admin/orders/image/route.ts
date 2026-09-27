import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isFarmz3dAdminRequest } from '@/lib/farmz3d/admin-auth';
import { loadOrderImage } from '@/lib/farmz3d/order-images';

export const runtime = 'nodejs';

// Streams an order's reference image to the logged-in admin. The bucket stays private.
export async function GET(request: Request) {
  if (!isFarmz3dAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Não autorizado.' }, { status: 401 });
  }

  const orderNumber = new URL(request.url).searchParams.get('order') ?? '';
  if (!/^FZ-\d{6}-[A-Z2-9]{4}$/.test(orderNumber)) {
    return NextResponse.json({ ok: false, message: 'Pedido inválido.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: false, message: 'Supabase não configurado.' }, { status: 503 });

  const { data } = await supabase.from('farmz3d_orders').select('image_path').eq('order_number', orderNumber).maybeSingle();
  const key = (data as { image_path: string | null } | null)?.image_path;
  const image = key ? await loadOrderImage(key) : null;
  if (!image) return NextResponse.json({ ok: false, message: 'Imagem não encontrada.' }, { status: 404 });

  return new NextResponse(Buffer.from(image.bytes), {
    headers: {
      'Content-Type': image.contentType,
      'Content-Disposition': `inline; filename="${orderNumber}.${key!.split('.').pop()}"`,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
