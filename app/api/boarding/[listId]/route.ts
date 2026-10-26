import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensurePassengerTables } from '@/lib/passengers-db';

export const dynamic = 'force-dynamic';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const pointsFrom = (value: string) => value.split('\n').map(point => point.trim()).filter(Boolean);

export async function GET(_: NextRequest, { params }: { params: Promise<{ listId: string }> }) {
  try {
    await ensurePassengerTables();
    const { listId } = await params;
    const rows = await db()`SELECT name, boarding_points AS "boardingPoints" FROM passenger_lists WHERE id=${listId}`;
    if (!rows.length) return NextResponse.json({ error: 'Formulário não encontrado.' }, { status: 404 });
    return NextResponse.json({ name: rows[0].name, points: pointsFrom(rows[0].boardingPoints) });
  } catch {
    return NextResponse.json({ error: 'Não foi possível abrir o formulário.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ listId: string }> }) {
  try {
    await ensurePassengerTables();
    const { listId } = await params;
    const body = await request.json();
    const fullName = String(body.fullName || '').trim();
    const phone = String(body.phone || '').trim();
    const boardingPoint = String(body.boardingPoint || '').trim();
    const sql = db();
    const lists = await sql`SELECT boarding_points AS "boardingPoints" FROM passenger_lists WHERE id=${listId}`;
    if (!lists.length) throw new Error('Formulário não encontrado.');
    if (!fullName || !phone || !boardingPoint) throw new Error('Informe seu nome completo, telefone e local de embarque.');
    if (phone.replace(/\D/g, '').length < 8) throw new Error('Informe um telefone válido.');
    if (!pointsFrom(lists[0].boardingPoints).includes(boardingPoint)) throw new Error('Selecione um local de embarque da lista.');
    const passengers = await sql`SELECT id, name FROM passengers WHERE list_id=${listId}`;
    const match = passengers.find(passenger => normalize(passenger.name) === normalize(fullName));
    await sql`INSERT INTO boarding_responses (list_id, full_name, phone, boarding_point, passenger_id) VALUES (${listId}, ${fullName}, ${phone}, ${boardingPoint}, ${match?.id || null})`;
    return NextResponse.json({ ok: true, matched: Boolean(match) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível enviar sua resposta.' }, { status: 400 });
  }
}
