import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { OrderStatusUpdateSchema, updateOrderStatus } from '@/lib/farmz3d/admin-data';
import { isFarmz3dAdminRequest } from '@/lib/farmz3d/admin-auth';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  if (!isFarmz3dAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Não autorizado.' }, { status: 401 });
  }

  const parsed = OrderStatusUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Dados inválidos.' }, { status: 400 });

  const result = await updateOrderStatus(parsed.data.orderNumber, parsed.data.status);
  if (!result.ok) return NextResponse.json(result, { status: result.status });

  revalidatePath('/admin');
  return NextResponse.json(result);
}
