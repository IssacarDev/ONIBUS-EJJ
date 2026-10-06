import { NextRequest, NextResponse } from 'next/server';
import { db, asNumber } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try { await requireAuth(); } catch { return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }); }
  const rows = await db()`SELECT id, contact_name AS "contactName", company_name AS "companyName", whatsapp, bus_size AS "busSize", bus_type AS "busType", created_at AS "createdAt" FROM companies ORDER BY company_name, contact_name`;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }); }
  const body = await request.json();
  const contactName = String(body.contactName || '').trim();
  const companyName = String(body.companyName || '').trim();
  const whatsapp = String(body.whatsapp || '').trim();
  const busSize = asNumber(body.busSize);
  const busType = String(body.busType || '');
  if (!contactName || !companyName || !busSize || !['Executivo', 'Convencional'].includes(busType)) return NextResponse.json({ error: 'Preencha nome, empresa, tamanho e tipo do ônibus.' }, { status: 400 });
  const rows = await db()`INSERT INTO companies (contact_name, company_name, whatsapp, bus_size, bus_type) VALUES (${contactName}, ${companyName}, ${whatsapp}, ${busSize}, ${busType}) RETURNING id`;
  return NextResponse.json({ id: rows[0].id }, { status: 201 });
}
