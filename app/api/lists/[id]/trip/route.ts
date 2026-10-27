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
    const updated = await sql`UPDATE passenger_lists SET travel_started_at=COALESCE(travel_started_at, NOW()), travel_ended_at=NULL, active_boarding_point=COALESCE(active_boarding_point, ${points[0]}), point_arrivals=CASE WHEN travel_started_at IS NULL THEN jsonb_build_object(${points[0]}::text, NOW()::text) ELSE point_arrivals END, updated_at=NOW() WHERE id=${id} RETURNING travel_started_at AS "travelStartedAt", travel_moving_at AS "travelMovingAt", moving_seconds AS "movingSeconds", travel_ended_at AS "travelEndedAt", active_boarding_point AS "activeBoardingPoint", point_arrivals AS "pointArrivals"`;
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
    const rows = await sql`SELECT boarding_points AS "boardingPoints", active_boarding_point AS "activeBoardingPoint", travel_started_at AS "travelStartedAt", travel_ended_at AS "travelEndedAt" FROM passenger_lists WHERE id=${id}`;
    if (!rows.length) throw new Error('Lista não encontrada.');
    const points = pointsFrom(rows[0].boardingPoints);
    if (!rows[0].travelStartedAt) throw new Error('Inicie a viagem antes de registrar os pontos.');
    if (rows[0].travelEndedAt) throw new Error('A viagem já foi encerrada. Use reset para iniciar novamente.');
    if (body.action === 'move') {
      const updated = await sql`UPDATE passenger_lists SET travel_moving_at=COALESCE(travel_moving_at, NOW()), updated_at=NOW() WHERE id=${id} RETURNING travel_started_at AS "travelStartedAt", travel_moving_at AS "travelMovingAt", moving_seconds AS "movingSeconds", travel_ended_at AS "travelEndedAt", active_boarding_point AS "activeBoardingPoint", point_arrivals AS "pointArrivals"`;
      return NextResponse.json(updated[0]);
    }
    if (body.action === 'finish') {
      const updated = await sql`UPDATE passenger_lists SET moving_seconds=moving_seconds + CASE WHEN travel_moving_at IS NULL THEN 0 ELSE FLOOR(EXTRACT(EPOCH FROM NOW() - travel_moving_at))::int END, travel_moving_at=NULL, travel_ended_at=NOW(), updated_at=NOW() WHERE id=${id} RETURNING travel_started_at AS "travelStartedAt", travel_moving_at AS "travelMovingAt", moving_seconds AS "movingSeconds", travel_ended_at AS "travelEndedAt", active_boarding_point AS "activeBoardingPoint", point_arrivals AS "pointArrivals"`;
      return NextResponse.json(updated[0]);
    }
    const current = rows[0].activeBoardingPoint || points[0];
    const next = body.action === 'next' ? points[points.indexOf(current) + 1] : String(body.boardingPoint || '').trim();
    if (!next || !points.includes(next)) throw new Error('Não há próximo ponto de embarque.');
    const changedPoint = next !== current;
    const updated = await sql`UPDATE passenger_lists SET active_boarding_point=${next}, point_arrivals=COALESCE(point_arrivals, '{}'::jsonb) || jsonb_build_object(${next}::text, NOW()::text), moving_seconds=moving_seconds + CASE WHEN ${changedPoint} AND travel_moving_at IS NOT NULL THEN FLOOR(EXTRACT(EPOCH FROM NOW() - travel_moving_at))::int ELSE 0 END, travel_moving_at=CASE WHEN ${changedPoint} THEN NULL ELSE travel_moving_at END, updated_at=NOW() WHERE id=${id} RETURNING travel_started_at AS "travelStartedAt", travel_moving_at AS "travelMovingAt", moving_seconds AS "movingSeconds", travel_ended_at AS "travelEndedAt", active_boarding_point AS "activeBoardingPoint", point_arrivals AS "pointArrivals"`;
    return NextResponse.json(updated[0]);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível avançar o ponto.' }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(); await ensurePassengerTables();
    const { id } = await params; const sql = db();
    const list = await sql`SELECT id FROM passenger_lists WHERE id=${id}`;
    if (!list.length) throw new Error('Lista não encontrada.');
    await sql`UPDATE passengers SET attendance_status='Pendente', attendance_at=NULL, return_attendance_status='Pendente', return_attendance_at=NULL, updated_at=NOW() WHERE list_id=${id}`;
    const updated = await sql`UPDATE passenger_lists SET travel_started_at=NULL, travel_moving_at=NULL, moving_seconds=0, travel_ended_at=NULL, active_boarding_point=NULL, point_arrivals='{}'::jsonb, updated_at=NOW() WHERE id=${id} RETURNING travel_started_at AS "travelStartedAt", travel_moving_at AS "travelMovingAt", moving_seconds AS "movingSeconds", travel_ended_at AS "travelEndedAt", active_boarding_point AS "activeBoardingPoint", point_arrivals AS "pointArrivals"`;
    return NextResponse.json(updated[0]);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível resetar a viagem.' }, { status: 400 });
  }
}
