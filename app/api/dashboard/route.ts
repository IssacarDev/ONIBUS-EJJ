import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function GET() { try { await requireAuth(); } catch { return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }); } const rows=await db()`SELECT (SELECT COUNT(*)::int FROM companies) AS "companies", (SELECT COUNT(*)::int FROM quotes WHERE availability='Disponível') AS "available", (SELECT COUNT(*)::int FROM quotes WHERE status IN ('Recebida','Em negociação','Selecionada')) AS "received", (SELECT MIN(total_value)::float FROM quotes WHERE availability='Disponível' AND total_value IS NOT NULL) AS "lowestValue"`; return NextResponse.json(rows[0]); }
