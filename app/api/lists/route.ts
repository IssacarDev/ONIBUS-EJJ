import { NextRequest, NextResponse } from 'next/server';
import { asNumber, db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { ensurePassengerTables } from '@/lib/passengers-db';

export const dynamic = 'force-dynamic';

async function seed() {
  const sql = db();
  const existing = await sql`SELECT id FROM passenger_lists LIMIT 1`;
  if (!existing.length) {
    await sql`INSERT INTO passenger_lists (name, capacity, default_value, bus_total) VALUES ('Ônibus EJJ Baixo Guandu', 46, 125, 5200)`;
  }
}

export async function GET() {
  try {
    await requireAuth(); await ensurePassengerTables();
    await seed();
    const rows = await db()`SELECT id, name, capacity, default_value::float AS "defaultValue", bus_total::float AS "busTotal", created_at AS "createdAt" FROM passenger_lists ORDER BY created_at DESC`;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível carregar as listas.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(); await ensurePassengerTables();
    const body = await request.json();
    const name = String(body.name || '').trim();
    const capacity = asNumber(body.capacity);
    const defaultValue = asNumber(body.defaultValue), busTotal = asNumber(body.busTotal);
    if (!name || !capacity || capacity < 1 || defaultValue === null || defaultValue < 0 || busTotal === null || busTotal < 0) throw new Error('Informe nome, número de vagas, valor padrão e custo do ônibus corretamente.');
    const rows = await db()`INSERT INTO passenger_lists (name, capacity, default_value, bus_total) VALUES (${name}, ${capacity}, ${defaultValue}, ${busTotal}) RETURNING id`;
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível salvar a lista.' }, { status: 400 });
  }
}
