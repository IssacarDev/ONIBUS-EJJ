import { NextRequest, NextResponse } from 'next/server';
import { asNumber, db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ensurePassengerTables } from '@/lib/passengers-db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(); await ensurePassengerTables();
    const { id } = await params;
    const body = await request.json();
    const name = String(body.name || '').trim();
    const capacity = asNumber(body.capacity);
    const defaultValue = asNumber(body.defaultValue), busTotal = asNumber(body.busTotal), cashBalance = asNumber(body.cashBalance);
    if (!name || !capacity || capacity < 1 || defaultValue === null || defaultValue < 0 || busTotal === null || busTotal < 0 || cashBalance === null || cashBalance < 0) throw new Error('Informe nome, número de vagas e valores corretamente.');
    const current = await db()`SELECT COUNT(*)::int AS count FROM passengers WHERE list_id=${id}`;
    if (capacity < current[0].count) throw new Error(`Esta lista já tem ${current[0].count} pessoa(s); aumente as vagas ou remova pessoas antes.`);
    await db()`UPDATE passenger_lists SET name=${name}, capacity=${capacity}, default_value=${defaultValue}, bus_total=${busTotal}, cash_balance=${cashBalance}, updated_at=NOW() WHERE id=${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível salvar a lista.' }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(); await ensurePassengerTables();
    const { id } = await params;
    await db()`DELETE FROM passenger_lists WHERE id=${id}`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Esta lista possui pessoas cadastradas. Remova-as antes de excluir a lista.' }, { status: 409 });
  }
}
