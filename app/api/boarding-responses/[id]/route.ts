import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ensurePassengerTables } from '@/lib/passengers-db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(); await ensurePassengerTables();
    const { id } = await params; const body = await request.json();
    const fullName = String(body.fullName || '').trim(); const phone = String(body.phone || '').trim(); const boardingPoint = String(body.boardingPoint || '').trim(); const passengerId = body.passengerId ? String(body.passengerId) : null;
    const sql = db(); const current = await sql`SELECT list_id AS "listId" FROM boarding_responses WHERE id=${id}`;
    if (!current.length) throw new Error('Resposta não encontrada.');
    const lists = await sql`SELECT boarding_points AS "boardingPoints" FROM passenger_lists WHERE id=${current[0].listId}`;
    const points = lists[0].boardingPoints.split('\n').map((point: string) => point.trim());
    if (!fullName || !points.includes(boardingPoint)) throw new Error('Informe nome e um local de embarque válido.');
    if (passengerId) { const passenger = await sql`SELECT id FROM passengers WHERE id=${passengerId} AND list_id=${current[0].listId}`; if (!passenger.length) throw new Error('A pessoa selecionada não pertence a esta lista.'); }
    await sql`UPDATE boarding_responses SET full_name=${fullName}, phone=${phone}, boarding_point=${boardingPoint}, passenger_id=${passengerId}, updated_at=NOW() WHERE id=${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível salvar a resposta.' }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); await ensurePassengerTables(); const { id } = await params; await db()`DELETE FROM boarding_responses WHERE id=${id}`; return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: 'Não foi possível excluir a resposta.' }, { status: 400 }); }
}
