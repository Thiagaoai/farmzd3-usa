import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDecision } from '@/lib/decisions/registry';
import { isFarmz3dAdminRequest } from '@/lib/farmz3d/admin-auth';
import { isTypeSafeConfigured } from '@/lib/typesafe/client';
import { mediateDecision } from '@/lib/typesafe/decision-mediation';
import { getPositions, saveMediation } from '@/lib/typesafe/store';

export const runtime = 'nodejs';

const BodySchema = z.object({ decisionId: z.string().min(1).max(120) });

// Ask Jev for the common ground between Thiago's and Bruna's positions.
export async function POST(request: Request) {
  if (!isFarmz3dAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Não autorizado.' }, { status: 401 });
  }
  if (!isTypeSafeConfigured()) {
    return NextResponse.json({ ok: false, message: 'Configure TYPESAFE_API_KEY para usar o Jev.' }, { status: 503 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Dados inválidos.' }, { status: 400 });

  const decision = getDecision(parsed.data.decisionId);
  if (!decision) return NextResponse.json({ ok: false, message: 'Decisão não encontrada.' }, { status: 404 });

  const positions = (await getPositions()).get(decision.id);
  if (!positions?.thiago || !positions?.bruna) {
    return NextResponse.json({ ok: false, message: 'Thiago e Bruna precisam registrar a posição primeiro.' }, { status: 409 });
  }

  const result = await mediateDecision(decision, { thiago: positions.thiago, bruna: positions.bruna });
  if (!result.ok) {
    console.error('[jev] mediation failed', result.error);
    return NextResponse.json({ ok: false, message: `Jev indisponível: ${result.error}` }, { status: 502 });
  }

  await saveMediation(decision.id, result.mediation);
  revalidatePath('/admin');
  return NextResponse.json({ ok: true, mediation: result.mediation });
}
