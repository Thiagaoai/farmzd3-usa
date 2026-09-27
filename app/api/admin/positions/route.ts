import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { getDecision } from '@/lib/decisions/registry';
import { isFarmz3dAdminRequest } from '@/lib/farmz3d/admin-auth';
import { PositionInputSchema, savePosition } from '@/lib/typesafe/store';

export const runtime = 'nodejs';

// A partner records their preferred option and why. Approval stays a separate, explicit step.
export async function POST(request: Request) {
  if (!isFarmz3dAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Não autorizado.' }, { status: 401 });
  }

  const parsed = PositionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const decision = getDecision(parsed.data.decisionId);
  if (!decision) return NextResponse.json({ ok: false, message: 'Decisão não encontrada.' }, { status: 404 });
  if (!decision.options.some((option) => option.id === parsed.data.optionId)) {
    return NextResponse.json({ ok: false, message: 'Opção inválida para esta decisão.' }, { status: 400 });
  }

  const result = await savePosition(parsed.data);
  if (!result.ok) return NextResponse.json(result, { status: result.status });

  revalidatePath('/admin');
  return NextResponse.json(result);
}
