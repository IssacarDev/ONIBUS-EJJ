import { NextRequest, NextResponse } from 'next/server';
import { asNumber, db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ensurePassengerTables } from '@/lib/passengers-db';

const statuses = ['Pago', 'Pego pelo pastor', 'Pago Davy', 'Reservado a pagar', 'Suplência'];

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(); await ensurePassengerTables();
    const { id } = await params;
    const body = await request.json();
    const name = String(body.name || '').trim();
    const status = String(body.status || 'Reservado a pagar');
    const chargeTo = String(body.chargeTo || '').trim();
    const amount = asNumber(body.amount);
    const notes = String(body.notes || '').trim();
    if (!name || !statuses.includes(status) || amount === null || amount < 0) throw new Error('Preencha nome, status e valor corretamente.');
    if (status !== 'Suplência') {
      const sql = db();
      const existing = await sql`SELECT list_id AS "listId" FROM passengers WHERE id=${id}`;
      if (!existing.length) throw new Error('Pessoa não encontrada.');
      const list = await sql`SELECT capacity, (SELECT COUNT(*)::int FROM passengers WHERE list_id=${existing[0].listId} AND status <> 'Suplência' AND id <> ${id}) AS people FROM passenger_lists WHERE id=${existing[0].listId}`;
      if (!list.length || list[0].people >= list[0].capacity) throw new Error('A lista já atingiu todas as vagas disponíveis. Mantenha esta pessoa como suplência ou libere uma vaga.');
    }
    await db()`UPDATE passengers SET name=${name}, status=${status}, charge_to=${chargeTo}, amount=${amount}, notes=${notes}, updated_at=NOW() WHERE id=${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível salvar a pessoa.' }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); await ensurePassengerTables(); const { id } = await params; await db()`DELETE FROM passengers WHERE id=${id}`; return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: 'Não foi possível excluir a pessoa.' }, { status: 400 }); }
}
