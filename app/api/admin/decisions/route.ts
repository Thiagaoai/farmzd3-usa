import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DecisionApprovalSchema } from '@/lib/decisions/schema';
import { approveDecision, resetDecision } from '@/lib/decisions/store';
import { isFarmz3dAdminRequest } from '@/lib/farmz3d/admin-auth';

export const runtime = 'nodejs';

const ResetSchema = z.object({ decisionId: z.string().min(1).max(120) });

function refreshPublicPages() {
  revalidatePath('/');
  revalidatePath('/admin');
}

// Approve an option: the public pages pick up the new value immediately.
export async function POST(request: Request) {
  if (!isFarmz3dAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Não autorizado.' }, { status: 401 });
  }

  const parsed = DecisionApprovalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });
  }

  const result = await approveDecision(parsed.data);
  if (!result.ok) return NextResponse.json(result, { status: result.status });

  refreshPublicPages();
  return NextResponse.json(result);
}

// Undo an approval: the value goes back to the recommendation.
export async function DELETE(request: Request) {
  if (!isFarmz3dAdminRequest(request)) {
    return NextResponse.json({ ok: false, message: 'Não autorizado.' }, { status: 401 });
  }

  const parsed = ResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Dados inválidos.' }, { status: 400 });

  const result = await resetDecision(parsed.data.decisionId);
  if (!result.ok) return NextResponse.json(result, { status: result.status });

  refreshPublicPages();
  return NextResponse.json(result);
}
