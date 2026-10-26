import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ensurePassengerTables } from '@/lib/passengers-db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(); await ensurePassengerTables();
    const { id } = await params; const body = await request.json();
    const present = body.present === true;
    const rows = await db()`UPDATE passengers SET attendance_status=${present ? 'Presente' : 'Pendente'}, attendance_at=${present ? new Date().toISOString() : null}, updated_at=NOW() WHERE id=${id} RETURNING attendance_status AS "attendanceStatus", attendance_at AS "attendanceAt"`;
    if (!rows.length) throw new Error('Pessoa não encontrada.');
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível registrar a chamada.' }, { status: 400 });
  }
}
