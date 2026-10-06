import { NextRequest, NextResponse } from 'next/server';
import { db, asNumber } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }); }
  const { id } = await params; const body = await request.json();
  const contactName = String(body.contactName || '').trim(), companyName = String(body.companyName || '').trim(), busSize = asNumber(body.busSize), busType = String(body.busType || '');
  if (!contactName || !companyName || !busSize || !['Executivo', 'Convencional'].includes(busType)) return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
  await db()`UPDATE companies SET contact_name=${contactName}, company_name=${companyName}, bus_size=${busSize}, bus_type=${busType}, updated_at=NOW() WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }); }
  const { id } = await params;
  try { await db()`DELETE FROM companies WHERE id=${id}`; return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: 'Essa empresa possui orçamentos. Exclua os orçamentos antes.' }, { status: 409 }); }
}
