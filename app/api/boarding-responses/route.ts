import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ensurePassengerTables } from '@/lib/passengers-db';

export const dynamic = 'force-dynamic';

async function validate(listId: string, fullName: string, boardingPoint: string, passengerId: string | null) {
  const sql = db();
  const lists = await sql`SELECT boarding_points AS "boardingPoints" FROM passenger_lists WHERE id=${listId}`;
  if (!lists.length) throw new Error('Lista não encontrada.');
  const points = lists[0].boardingPoints.split('\n').map((point: string) => point.trim());
  if (!fullName || !boardingPoint || !points.includes(boardingPoint)) throw new Error('Informe nome e um local de embarque válido.');
  if (passengerId) {
    const passenger = await sql`SELECT id FROM passengers WHERE id=${passengerId} AND list_id=${listId}`;
    if (!passenger.length) throw new Error('A pessoa selecionada não pertence a esta lista.');
  }
}

export async function GET() {
  try {
    await requireAuth(); await ensurePassengerTables();
    const rows = await db()`SELECT response.id, response.list_id AS "listId", response.full_name AS "fullName", response.boarding_point AS "boardingPoint", response.passenger_id AS "passengerId", passenger.name AS "passengerName", response.created_at AS "createdAt" FROM boarding_responses response LEFT JOIN passengers passenger ON passenger.id=response.passenger_id ORDER BY response.created_at DESC`;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível carregar as respostas.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(); await ensurePassengerTables();
    const body = await request.json();
    const listId = String(body.listId || ''); const fullName = String(body.fullName || '').trim(); const boardingPoint = String(body.boardingPoint || '').trim(); const passengerId = body.passengerId ? String(body.passengerId) : null;
    await validate(listId, fullName, boardingPoint, passengerId);
    const rows = await db()`INSERT INTO boarding_responses (list_id, full_name, boarding_point, passenger_id) VALUES (${listId}, ${fullName}, ${boardingPoint}, ${passengerId}) RETURNING id`;
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível salvar a resposta.' }, { status: 400 });
  }
}
