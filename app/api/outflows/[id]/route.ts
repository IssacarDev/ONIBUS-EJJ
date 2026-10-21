import { NextRequest, NextResponse } from 'next/server';
import { asNumber, db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ensurePassengerTables } from '@/lib/passengers-db';

function parse(body: Record<string, unknown>) {
  const recipient = String(body.recipient || '').trim();
  const amount = asNumber(body.amount);
  const reason = String(body.reason || '').trim();
  if (!recipient || amount === null || amount <= 0) throw new Error('Informe a pessoa e o valor da saída.');
  return { recipient, amount, reason };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(); await ensurePassengerTables();
    const { id } = await params;
    const item = parse(await request.json());
    await db()`UPDATE cash_outflows SET recipient=${item.recipient}, amount=${item.amount}, reason=${item.reason}, updated_at=NOW() WHERE id=${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível salvar a saída.' }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(); await ensurePassengerTables();
    const { id } = await params;
    await db()`DELETE FROM cash_outflows WHERE id=${id}`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível excluir a saída.' }, { status: 400 });
  }
}
