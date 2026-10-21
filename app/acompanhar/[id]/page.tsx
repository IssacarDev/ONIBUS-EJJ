import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ensurePassengerTables } from '@/lib/passengers-db';

export const dynamic = 'force-dynamic';

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'America/Sao_Paulo' }).format(new Date(value));

export default async function PublicTracking({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await ensurePassengerTables();
  const sql = db();
  const lists = await sql`SELECT name, capacity, bus_total::float AS "busTotal" FROM passenger_lists WHERE id=${id}`;
  if (!lists.length) notFound();
  const list = lists[0];
  const payments = await sql`SELECT status, received_amount::float AS "receivedAmount" FROM passengers WHERE list_id=${id}`;
  const outflows = await sql`SELECT id, recipient, amount::float AS amount, reason, created_at AS "createdAt" FROM cash_outflows WHERE list_id=${id} ORDER BY created_at DESC`;
  const received = payments.filter(person => ['Pago', 'Pago Davy', 'Pago parcial'].includes(person.status)).reduce((sum, person) => sum + person.receivedAmount, 0);
  const pastor = payments.filter(person => person.status === 'Pago pelo pastor').reduce((sum, person) => sum + person.receivedAmount, 0);
  const spent = outflows.reduce((sum, outflow) => sum + outflow.amount, 0);
  const cash = received - spent;
  const remaining = Math.max(0, list.busTotal - cash - pastor);

  return <main className="public-page"><header className="public-header"><a href="/" className="public-brand"><span>EJJ</span> Ônibus</a><p>Acompanhamento público · somente leitura</p></header><section className="public-shell"><p className="eyebrow">TRANSPARÊNCIA DO CAIXA</p><h1>{list.name}</h1><p className="public-intro">Acompanhe a situação financeira da viagem e as saídas registradas. Esta página não exibe dados pessoais de passageiros.</p><section className="public-metrics"><article><span>EM CAIXA</span><strong>{money(cash)}</strong><small>Entradas menos saídas</small></article><article><span>PAGO PELO PAULO</span><strong>{money(pastor)}</strong><small>Valor fora do caixa</small></article><article><span>SAÍDAS REGISTRADAS</span><strong>{money(spent)}</strong><small>{outflows.length} lançamento(s)</small></article><article><span>FALTA PARA O ÔNIBUS</span><strong>{money(remaining)}</strong><small>Do custo de {money(list.busTotal)}</small></article></section><section className="public-ledger"><div><p className="eyebrow">MOVIMENTAÇÕES</p><h2>Saídas de caixa</h2></div>{outflows.length ? <div className="public-rows">{outflows.map(outflow => <article key={outflow.id}><span><b>{outflow.recipient}</b><small>{outflow.reason || 'Sem descrição'} · {date(outflow.createdAt)}</small></span><strong>− {money(outflow.amount)}</strong></article>)}</div> : <p className="public-empty">Nenhuma saída foi registrada até o momento.</p>}</section></section><footer className="public-footer">Lista do ônibus EJJ · acompanhamento atualizado conforme os registros.</footer></main>;
}
