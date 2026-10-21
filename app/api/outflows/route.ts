import { NextRequest, NextResponse } from 'next/server';
import { asNumber, db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ensurePassengerTables } from '@/lib/passengers-db';

export const dynamic = 'force-dynamic';

function parse(body: Record<string, unknown>) {
  const listId = String(body.listId || '');
  const recipient = String(body.recipient || '').trim();
  const amount = asNumber(body.amount);
  const reason = String(body.reason || '').trim();
  if (!listId || !recipient || amount === null || amount <= 0) throw new Error('Informe a pessoa, o valor da saída e a lista.');
  return { listId, recipient, amount, reason };
}

export async function GET() {
  try {
    await requireAuth(); await ensurePassengerTables();
    const rows = await db()`SELECT id, list_id AS "listId", recipient, amount::float AS amount, reason, created_at AS "createdAt" FROM cash_outflows ORDER BY created_at DESC`;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível carregar as saídas de caixa.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(); await ensurePassengerTables();
    const item = parse(await request.json());
    const rows = await db()`INSERT INTO cash_outflows (list_id, recipient, amount, reason) VALUES (${item.listId}, ${item.recipient}, ${item.amount}, ${item.reason}) RETURNING id`;
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível registrar a saída.' }, { status: 400 });
  }
}
