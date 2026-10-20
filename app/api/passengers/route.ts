import { NextRequest, NextResponse } from 'next/server';
import { asNumber, db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ensurePassengerTables } from '@/lib/passengers-db';

export const dynamic = 'force-dynamic';
const statuses = ['Pago', 'Pago pelo pastor', 'Pago Davy', 'Reservado a pagar', 'Suplência'];

function parse(body: Record<string, unknown>) {
  const listId = String(body.listId || '');
  const name = String(body.name || '').trim();
  const status = String(body.status || 'Reservado a pagar');
  const chargeTo = String(body.chargeTo || '').trim();
  const amount = asNumber(body.amount);
  const discount = asNumber(body.discount) ?? 0;
  const notes = String(body.notes || '').trim();
  if (!listId || !name || !statuses.includes(status) || amount === null || amount < 0 || discount < 0) throw new Error('Preencha nome, status, valor e desconto corretamente.');
  return { listId, name, status, chargeTo, amount, discount, notes };
}

export async function GET() {
  try {
    await requireAuth(); await ensurePassengerTables();
    const rows = await db()`SELECT id, list_id AS "listId", name, status, charge_to AS "chargeTo", amount::float AS amount, discount::float AS discount, notes, created_at AS "createdAt" FROM passengers ORDER BY created_at ASC`;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível carregar as pessoas.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(); await ensurePassengerTables();
    const x = parse(await request.json());
    const sql = db();
    const list = await sql`SELECT capacity, (SELECT COUNT(*)::int FROM passengers WHERE list_id=${x.listId} AND status <> 'Suplência') AS people FROM passenger_lists WHERE id=${x.listId}`;
    if (!list.length) throw new Error('Lista não encontrada.');
    if (x.status !== 'Suplência' && list[0].people >= list[0].capacity) throw new Error('A lista já atingiu todas as vagas disponíveis. Cadastre como suplência ou libere uma vaga.');
    const rows = await sql`INSERT INTO passengers (list_id, name, status, charge_to, amount, discount, notes) VALUES (${x.listId}, ${x.name}, ${x.status}, ${x.chargeTo}, ${x.amount}, ${x.discount}, ${x.notes}) RETURNING id`;
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível cadastrar a pessoa.' }, { status: 400 });
  }
}
