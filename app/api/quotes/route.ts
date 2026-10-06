import { NextRequest, NextResponse } from 'next/server';
import { asNumber, db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const availability = ['Disponível', 'Sem disponibilidade nesta data', 'A confirmar'];
const reserve = ['Possui ônibus reserva', 'Não possui ônibus reserva', 'Não informado'];
const statuses = ['Solicitada', 'Recebida', 'Em negociação', 'Selecionada', 'Recusada', 'Indisponível'];

function parse(body: Record<string, unknown>) {
  const companyId = String(body.companyId || ''), a = String(body.availability || ''), r = String(body.reserveBus || ''), total = asNumber(body.totalValue), deposit = asNumber(body.depositPercent);
  let status = String(body.status || 'Solicitada');
  if (!companyId || !availability.includes(a) || !reserve.includes(r) || !statuses.includes(status)) throw new Error('Preencha a empresa, disponibilidade, reserva e status.');
  if (a === 'Sem disponibilidade nesta data') status = 'Indisponível';
  if (status === 'Selecionada' && a !== 'Disponível') throw new Error('Só é possível selecionar uma empresa disponível.');
  if (['Recebida', 'Em negociação', 'Selecionada'].includes(status) && (!total || total <= 0)) throw new Error('Informe o valor total da proposta.');
  return { companyId, availability: a, reserveBus: r, total, deposit, status, payment: String(body.paymentMethod || '').trim() || null, valid: String(body.validUntil || '').trim() || null, link: String(body.proposalLink || '').trim() || null, notes: String(body.notes || '').trim() || null };
}

export async function GET() {
  try { await requireAuth(); } catch { return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }); }
  const rows = await db()`SELECT q.id, q.company_id AS "companyId", c.contact_name AS "contactName", c.company_name AS "companyName", c.bus_size AS "busSize", c.bus_type AS "busType", q.availability, q.reserve_bus AS "reserveBus", q.total_value::float AS "totalValue", q.deposit_percent::float AS "depositPercent", q.payment_method AS "paymentMethod", q.status, TO_CHAR(q.valid_until,'YYYY-MM-DD') AS "validUntil", q.proposal_link AS "proposalLink", q.notes, q.created_at AS "createdAt" FROM quotes q JOIN companies c ON c.id=q.company_id ORDER BY q.created_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }); }
  try { const x = parse(await request.json()); const sql = db(); if (x.status === 'Selecionada') await sql`UPDATE quotes SET status='Em negociação' WHERE status='Selecionada'`;
    const rows = await sql`INSERT INTO quotes (company_id, availability, reserve_bus, total_value, deposit_percent, payment_method, status, valid_until, proposal_link, notes) VALUES (${x.companyId}, ${x.availability}, ${x.reserveBus}, ${x.total}, ${x.deposit}, ${x.payment}, ${x.status}, ${x.valid}, ${x.link}, ${x.notes}) RETURNING id`; return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível salvar.' }, { status: 400 }); }
}
