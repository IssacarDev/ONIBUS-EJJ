import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ensurePassengerTables } from '@/lib/passengers-db';

const pointsFrom = (value: string) => value.split('\n').map(point => point.trim()).filter(Boolean);

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(); await ensurePassengerTables();
    const { id } = await params;
    const sql = db();
    const rows = await sql`SELECT boarding_points AS "boardingPoints" FROM passenger_lists WHERE id=${id}`;
    if (!rows.length) throw new Error('Lista não encontrada.');
    const points = pointsFrom(rows[0].boardingPoints);
    if (!points.length) throw new Error('Cadastre ao menos um ponto de embarque.');
    const updated = await sql`UPDATE passenger_lists SET travel_started_at=COALESCE(travel_started_at, NOW()), active_boarding_point=COALESCE(active_boarding_point, ${points[0]}), updated_at=NOW() WHERE id=${id} RETURNING travel_started_at AS "travelStartedAt", active_boarding_point AS "activeBoardingPoint"`;
    return NextResponse.json(updated[0]);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível iniciar a viagem.' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(); await ensurePassengerTables();
    const { id } = await params; const body = await request.json();
    const sql = db();
    const rows = await sql`SELECT boarding_points AS "boardingPoints", active_boarding_point AS "activeBoardingPoint" FROM passenger_lists WHERE id=${id}`;
    if (!rows.length) throw new Error('Lista não encontrada.');
    const points = pointsFrom(rows[0].boardingPoints);
    const current = rows[0].activeBoardingPoint || points[0];
    const next = body.action === 'next' ? points[points.indexOf(current) + 1] : String(body.boardingPoint || '').trim();
    if (!next || !points.includes(next)) throw new Error('Não há próximo ponto de embarque.');
    const updated = await sql`UPDATE passenger_lists SET active_boarding_point=${next}, updated_at=NOW() WHERE id=${id} RETURNING travel_started_at AS "travelStartedAt", active_boarding_point AS "activeBoardingPoint"`;
    return NextResponse.json(updated[0]);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível avançar o ponto.' }, { status: 400 });
  }
}
