import { NextRequest, NextResponse } from 'next/server';
import { asNumber, db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const options = { availability: ['Disponível', 'Sem disponibilidade nesta data', 'A confirmar'], reserve: ['Possui ônibus reserva', 'Não possui ônibus reserva', 'Não informado'], statuses: ['Solicitada', 'Recebida', 'Em negociação', 'Selecionada', 'Recusada', 'Indisponível'] };
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }); }
  try { const { id } = await params, b = await request.json(), companyId = String(b.companyId || ''), availability = String(b.availability || ''), reserveBus = String(b.reserveBus || ''), total = asNumber(b.totalValue), deposit = asNumber(b.depositPercent); let status = String(b.status || 'Solicitada');
    if (!companyId || !options.availability.includes(availability) || !options.reserve.includes(reserveBus) || !options.statuses.includes(status)) throw new Error('Preencha os campos obrigatórios.'); if (availability === 'Sem disponibilidade nesta data') status = 'Indisponível'; if (status === 'Selecionada' && availability !== 'Disponível') throw new Error('Só é possível selecionar uma empresa disponível.'); if (['Recebida','Em negociação','Selecionada'].includes(status) && (!total || total <= 0)) throw new Error('Informe o valor total da proposta.'); const sql=db(); if(status==='Selecionada') await sql`UPDATE quotes SET status='Em negociação' WHERE status='Selecionada' AND id<>${id}`;
    await sql`UPDATE quotes SET company_id=${companyId}, availability=${availability}, reserve_bus=${reserveBus}, total_value=${total}, deposit_percent=${deposit}, payment_method=${String(b.paymentMethod||'').trim()||null}, status=${status}, valid_until=${String(b.validUntil||'').trim()||null}, proposal_link=${String(b.proposalLink||'').trim()||null}, notes=${String(b.notes||'').trim()||null}, updated_at=NOW() WHERE id=${id}`; return NextResponse.json({ ok:true });
  } catch(error) { return NextResponse.json({ error:error instanceof Error?error.message:'Não foi possível salvar.' },{status:400}); }
}
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { await requireAuth(); } catch { return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }); } const { id }=await params; await db()`DELETE FROM quotes WHERE id=${id}`; return NextResponse.json({ok:true}); }
