'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import type { Passenger, PassengerList, PaymentStatus } from '@/lib/types';

type View = 'dashboard' | 'people' | 'lists';
type PersonFilter = 'Todos' | 'Pendentes' | PaymentStatus;
const paymentStatuses: PaymentStatus[] = ['Pago', 'Pago parcial', 'Pago pelo pastor', 'Pago Davy', 'Reservado a pagar', 'Suplência'];
const personFilters: PersonFilter[] = ['Todos', 'Pendentes', ...paymentStatuses];
const blankList = { name: '', capacity: '46', defaultValue: '125', busTotal: '5200', cashBalance: '0' };
const blankPerson = { name: '', status: 'Reservado a pagar' as PaymentStatus, chargeTo: '', amount: '125', receivedAmount: '0', discount: '0', notes: '' };
const storageKey = 'ejj.passageiros.lista-atual';

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
// O caixa só recebe valores que realmente entraram: pagamentos diretos e os recebidos pelo Davy.
// Pagamentos feitos pelo pastor ficam registrados separadamente, pois não entram no dinheiro em mãos.
const countsAsCash = (status: PaymentStatus) => ['Pago', 'Pago Davy'].includes(status);
const isOutstanding = (person: Passenger) => person.status === 'Reservado a pagar' || person.status === 'Pago parcial';
const outstandingAmount = (person: Passenger) => isOutstanding(person) ? Math.max(0, person.amount - person.receivedAmount) : 0;
const tag = (status: PaymentStatus) => <span className={'tag ' + (status === 'Pago' || status === 'Pago pelo pastor' ? 'green' : status === 'Reservado a pagar' || status === 'Pago parcial' ? 'amber' : 'blue')}>{status}</span>;
const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
function downloadCsv(name: string, headers: string[], rows: unknown[][]) { const content = [headers.map(csvCell).join(';'), ...rows.map(row => row.map(csvCell).join(';'))].join('\n'); const url = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }

export default function Dashboard() {
  const [view, setView] = useState<View>('dashboard');
  const [lists, setLists] = useState<PassengerList[]>([]);
  const [people, setPeople] = useState<Passenger[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [modal, setModal] = useState<'list' | 'person' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [listForm, setListForm] = useState(blankList);
  const [personForm, setPersonForm] = useState(blankPerson);
  const [query, setQuery] = useState('');
  const [personFilter, setPersonFilter] = useState<PersonFilter>('Todos');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Carrega em sequência para concluir qualquer atualização da estrutura do banco antes das pessoas.
      const listsResponse = await fetch('/api/lists');
      const peopleResponse = await fetch('/api/passengers');
      if (!listsResponse.ok || !peopleResponse.ok) throw new Error('Não foi possível carregar os dados da lista.');
      const listsData = await listsResponse.json() as PassengerList[];
      const peopleData = await peopleResponse.json() as Passenger[];
      const saved = window.localStorage.getItem(storageKey);
      const current = saved && listsData.some(list => list.id === saved) ? saved : listsData[0]?.id || '';
      setLists(listsData); setPeople(peopleData); setSelectedListId(current);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao carregar os dados.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch('/api/auth/me').then(response => response.json()).then(data => { setAuthenticated(data.authenticated); if (data.authenticated) load(); }).catch(() => setAuthenticated(false)); }, []);
  const tell = (message: string) => { setNotice(message); setTimeout(() => setNotice(''), 3500); };
  const selectedList = lists.find(list => list.id === selectedListId);
  const selectedPeople = useMemo(() => people.filter(person => person.listId === selectedListId), [people, selectedListId]);
  const shownPeople = useMemo(() => selectedPeople.filter(person => Object.values(person).join(' ').toLowerCase().includes(query.toLowerCase()) && (personFilter === 'Todos' || (personFilter === 'Pendentes' ? isOutstanding(person) : person.status === personFilter))), [selectedPeople, query, personFilter]);
  const seatedPeople = selectedPeople.filter(person => person.status !== 'Suplência');
  const paidPeople = selectedPeople.filter(person => countsAsCash(person.status) || person.status === 'Pago parcial');
  const awaitingPeople = selectedPeople.filter(isOutstanding);
  const heldOutside = selectedPeople.filter(person => person.status === 'Pago pelo pastor').reduce((sum, person) => sum + person.receivedAmount, 0);
  const collected = paidPeople.reduce((sum, person) => sum + person.receivedAmount, 0);
  const cash = collected;
  const awaiting = awaitingPeople.reduce((sum, person) => sum + outstandingAmount(person), 0);
  // Para quitar o ônibus, entram tanto o dinheiro em caixa quanto os valores já pagos pelo Paulo.
  const busRemaining = Math.max(0, (selectedList?.busTotal || 0) - collected - heldOutside);
  const vacancies = Math.max(0, (selectedList?.capacity || 0) - seatedPeople.length);

  const chooseList = (id: string) => { window.localStorage.setItem(storageKey, id); setSelectedListId(id); };
  const openList = (item?: PassengerList) => { setEditId(item?.id || null); setListForm(item ? { name: item.name, capacity: String(item.capacity), defaultValue: String(item.defaultValue), busTotal: String(item.busTotal), cashBalance: String(item.cashBalance || 0) } : blankList); setModal('list'); };
  const openPerson = (item?: Passenger) => {
    if (!item && !selectedList) { setError('Crie ou selecione uma lista antes de cadastrar uma pessoa.'); return; }
    setEditId(item?.id || null);
    setPersonForm(item ? { name: item.name, status: item.status, chargeTo: item.chargeTo || '', amount: String(item.amount), receivedAmount: String(item.receivedAmount || 0), discount: String(item.discount || 0), notes: item.notes || '' } : { ...blankPerson, amount: String(selectedList!.defaultValue) });
    setModal('person');
  };
  const saveList = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch(editId ? `/api/lists/${editId}` : '/api/lists', { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...listForm, capacity: Number(listForm.capacity), defaultValue: Number(listForm.defaultValue), busTotal: Number(listForm.busTotal), cashBalance: Number(listForm.cashBalance) }) });
    const data = await response.json(); if (!response.ok) { setError(data.error); return; }
    if (!editId) window.localStorage.setItem(storageKey, data.id);
    setModal(null); tell(editId ? 'Lista atualizada.' : 'Lista criada com sucesso.'); load();
  };
  const savePerson = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch(editId ? `/api/passengers/${editId}` : '/api/passengers', { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...personForm, listId: selectedListId, amount: Number(personForm.amount), receivedAmount: Number(personForm.receivedAmount), discount: Number(personForm.discount) }) });
    const data = await response.json(); if (!response.ok) { setError(data.error); return; }
    setModal(null); tell(editId ? 'Pessoa atualizada.' : 'Pessoa cadastrada na lista.'); load();
  };
  const remove = async (kind: 'lists' | 'passengers', id: string) => {
    if (!confirm('Excluir este registro?')) return;
    const response = await fetch(`/api/${kind}/${id}`, { method: 'DELETE' }); const data = await response.json();
    if (!response.ok) { setError(data.error); return; }
    if (kind === 'lists' && selectedListId === id) window.localStorage.removeItem(storageKey);
    tell('Registro excluído.'); load();
  };
  const exportCurrent = () => {
    if (view === 'lists') { downloadCsv('listas-de-passageiros.csv', ['Lista', 'Vagas', 'Valor padrão'], lists.map(list => [list.name, list.capacity, list.defaultValue])); tell('Listas exportadas.'); return; }
    downloadCsv(`passageiros-${selectedList?.name || 'lista'}.csv`, ['Nome', 'Status', 'Quem cobrar', 'Valor combinado', 'Já recebido', 'Falta cobrar', 'Desconto', 'Observações'], selectedPeople.map(person => [person.name, person.status, person.chargeTo, person.amount, person.receivedAmount, outstandingAmount(person), person.discount, person.notes])); tell('Lista de pessoas exportada.');
  };
  const login = async (username: string, password: string) => { const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setAuthenticated(true); load(); };
  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); setAuthenticated(false); setPeople([]); setLists([]); };

  if (authenticated === null) return <main className="login-page"><div className="loader" />Preparando acesso…</main>;
  if (!authenticated) return <Login onSubmit={login} />;

  const intro = view === 'dashboard' ? ['LISTA DO ÔNIBUS', 'Todas as vagas e pagamentos, em um só lugar.', 'Acompanhe quem confirmou presença, quem já pagou e quem ainda precisa ser cobrado.'] : view === 'people' ? ['PASSAGEIROS', 'Organize cada vaga.', 'Cadastre uma pessoa, informe o status e ajuste o valor individual quando precisar.'] : ['LISTAS', 'Monte suas listas.', 'Defina o nome, as vagas disponíveis e o valor padrão por pessoa.'];
  return <main>
    <header className="topbar"><div className="brand"><span className="mark">EJJ</span><div><strong>Lista do ônibus</strong><small>Passageiros e pagamentos</small></div></div><nav>{([['dashboard', 'Visão geral'], ['people', 'Pessoas'], ['lists', 'Listas']] as [View, string][]).map(([id, name]) => <button key={id} onClick={() => setView(id)} className={view === id ? 'active' : ''}>{name}</button>)}</nav><button className="signout" onClick={logout}>Sair</button><button className="new" onClick={() => view === 'lists' ? openList() : openPerson()}>{view === 'lists' ? '+ Nova lista' : '+ Adicionar pessoa'}</button></header>
    <section className="shell">
      <div className="heading"><div><p className="eyebrow">{intro[0]}</p><h1>{intro[1]}</h1><p>{intro[2]}</p></div><div className="trip"><span>LISTA ATUAL</span>{lists.length ? <select value={selectedListId} onChange={event => chooseList(event.target.value)}>{lists.map(list => <option value={list.id} key={list.id}>{list.name}</option>)}</select> : <button onClick={() => openList()}>Criar lista</button>}{selectedList && <b>{selectedList.capacity} vagas · {money(selectedList.defaultValue)}</b>}</div></div>
      {error && <div className="notice error">{error}<button onClick={() => setError('')}>×</button></div>}{notice && <div className="notice">{notice}</div>}
      {loading ? <div className="empty"><div className="loader" />Carregando a lista…</div> : view === 'dashboard' ? <Overview list={selectedList} people={selectedPeople} seatedCount={seatedPeople.length} vacancies={vacancies} cash={cash} heldOutside={heldOutside} busRemaining={busRemaining} awaiting={awaiting} openPerson={openPerson} setView={setView} /> : view === 'people' ? <section className="board"><div className="toolbar"><label>Buscar <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome, status ou cobrança" /></label><label>Filtrar por situação <select value={personFilter} onChange={event => setPersonFilter(event.target.value as PersonFilter)}>{personFilters.map(filter => <option key={filter}>{filter}</option>)}</select></label><span>{seatedPeople.length} de {selectedList?.capacity || 0} vaga(s) · {selectedPeople.filter(person => person.status === 'Suplência').length} suplente(s)</span><button className="export" onClick={exportCurrent}>Exportar CSV ↓</button></div><PeopleTable people={shownPeople} open={openPerson} remove={id => remove('passengers', id)} /></section> : <section className="board"><div className="toolbar"><span>{lists.length} lista(s)</span><button className="export" onClick={exportCurrent}>Exportar CSV ↓</button></div><ListsTable lists={lists} people={people} current={selectedListId} choose={chooseList} open={openList} remove={id => remove('lists', id)} /></section>}
    </section>
    {modal === 'list' && <Modal title={editId ? 'Editar lista' : 'Criar lista'} close={() => setModal(null)}><form onSubmit={saveList} className="form"><Input label="Nome da lista" required wide value={listForm.name} placeholder="Ex.: Ônibus EJJ Baixo Guandu" onChange={name => setListForm({ ...listForm, name })} /><Input label="Quantidade de vagas" required type="number" value={listForm.capacity} onChange={capacity => setListForm({ ...listForm, capacity })} /><Input label="Valor geral por pessoa" required type="number" value={listForm.defaultValue} onChange={defaultValue => setListForm({ ...listForm, defaultValue })} /><Input label="Custo total do ônibus" required type="number" value={listForm.busTotal} onChange={busTotal => setListForm({ ...listForm, busTotal })} /><p className="form-note wide">O valor real em caixa é atualizado automaticamente apenas quando o pagamento entra: <b>Pago</b> ou <b>Pago Davy</b>.</p><FormFooter close={() => setModal(null)} text="Salvar lista" /></form></Modal>}
    {modal === 'person' && <Modal title={editId ? 'Editar pessoa' : 'Adicionar pessoa'} close={() => setModal(null)}><form onSubmit={savePerson} className="form"><Input label="Nome da pessoa" required wide value={personForm.name} placeholder="Nome completo" onChange={name => setPersonForm({ ...personForm, name })} /><Select label="Status" required value={personForm.status} onChange={status => setPersonForm({ ...personForm, status: status as PaymentStatus })} options={paymentStatuses} /><Input label="Valor total combinado" required type="number" value={personForm.amount} onChange={amount => setPersonForm({ ...personForm, amount })} />{personForm.status === 'Pago parcial' && <Input label="Valor já recebido" required type="number" value={personForm.receivedAmount} onChange={receivedAmount => setPersonForm({ ...personForm, receivedAmount })} />}<Input label="Desconto" type="number" value={personForm.discount} onChange={discount => setPersonForm({ ...personForm, discount })} /><Input label="Quem cobrar" wide value={personForm.chargeTo} placeholder="Ex.: nome do responsável" onChange={chargeTo => setPersonForm({ ...personForm, chargeTo })} /><label className="field wide">Observações<textarea value={personForm.notes} onChange={event => setPersonForm({ ...personForm, notes: event.target.value })} placeholder="Opcional" /></label>{personForm.status === 'Pago parcial' && <p className="form-note wide">A diferença entre o valor combinado e o valor recebido aparecerá automaticamente em <b>a cobrar</b>.</p>}<FormFooter close={() => setModal(null)} text="Salvar pessoa" /></form></Modal>}
  </main>;
}

function Overview({ list, people, seatedCount, vacancies, cash, heldOutside, busRemaining, awaiting, openPerson, setView }: { list?: PassengerList; people: Passenger[]; seatedCount: number; vacancies: number; cash: number; heldOutside: number; busRemaining: number; awaiting: number; openPerson: (person?: Passenger) => void; setView: (view: View) => void }) {
  if (!list) return <div className="empty"><h2>Crie a primeira lista</h2><p className="empty-copy">Defina o nome, 46 vagas e o valor padrão de R$ 125,00.</p></div>;
  return <><div className="overview-actions"><span>{list.name} · custo do ônibus: {money(list.busTotal)} · valor geral: {money(list.defaultValue)}</span><button className="export" onClick={() => setView('people')}>Ver lista completa →</button></div><section className="metrics"><Metric num={money(cash)} label="valor real em caixa" tone="green" /><Metric num={money(heldOutside)} label="valor com Paulo (pastor)" tone="blue" /><Metric num={money(busRemaining)} label="faltante do ônibus" tone="gold" /><Metric num={money(awaiting)} label="a cobrar" /></section><section className="decision" style={{ gridTemplateColumns: '1fr' }}><div className="recent"><div className="sectiontitle"><div><p className="eyebrow">PESSOAS CADASTRADAS</p><h2>{seatedCount}/{list.capacity} vagas · {vacancies} livre(s)</h2></div><button className="link" onClick={() => setView('people')}>Ver todos →</button></div>{people.length ? people.slice(-5).reverse().map(person => <button key={person.id} className="quote-row" onClick={() => openPerson(person)}><span><b>{person.name}</b><small>{person.chargeTo ? `Cobrar de: ${person.chargeTo}` : 'Sem responsável de cobrança'}</small></span><span><b>{money(person.amount)}</b>{tag(person.status)}</span></button>) : <Empty text="Adicione as pessoas que irão no ônibus." />}</div></section></>;
}

function PeopleTable({ people, open, remove }: { people: Passenger[]; open: (person: Passenger) => void; remove: (id: string) => void }) { return <table><thead><tr><th>Nome</th><th>Status</th><th>Quem cobrar</th><th>Valores</th><th /></tr></thead><tbody>{people.length ? people.map(person => <tr key={person.id}><td><b>{person.name}</b>{person.notes && <small>{person.notes}</small>}</td><td>{tag(person.status)}</td><td>{person.chargeTo || '—'}</td><td><b>{money(person.amount)}</b>{person.status === 'Pago parcial' && <small>Recebido: {money(person.receivedAmount)} · Falta: {money(outstandingAmount(person))}</small>}{person.discount > 0 && <small>Desconto: {money(person.discount)}</small>}</td><td className="actions"><button onClick={() => open(person)}>Editar</button><button className="danger" onClick={() => remove(person.id)}>Excluir</button></td></tr>) : <tr><td colSpan={5}><Empty text="Nenhuma pessoa encontrada para este filtro." /></td></tr>}</tbody></table>; }
function ListsTable({ lists, people, current, choose, open, remove }: { lists: PassengerList[]; people: Passenger[]; current: string; choose: (id: string) => void; open: (list: PassengerList) => void; remove: (id: string) => void }) { return <table><thead><tr><th>Lista</th><th>Vagas</th><th>Valor geral</th><th>Status</th><th /></tr></thead><tbody>{lists.map(list => { const count = people.filter(person => person.listId === list.id && person.status !== 'Suplência').length; const substitutes = people.filter(person => person.listId === list.id && person.status === 'Suplência').length; return <tr key={list.id}><td><b>{list.name}</b></td><td>{count} de {list.capacity}<small>{substitutes ? `${substitutes} em suplência` : ''}</small></td><td><b>{money(list.defaultValue)}</b><small>por pessoa</small></td><td>{list.id === current ? <span className="tag green">Ativa</span> : <button className="link" onClick={() => choose(list.id)}>Selecionar</button>}</td><td className="actions"><button onClick={() => open(list)}>Editar</button><button className="danger" onClick={() => remove(list.id)}>Excluir</button></td></tr>; })}</tbody></table>; }
function Metric({ num, label, tone = '' }: { num: string | number; label: string; tone?: string }) { return <article className={'metric ' + tone}><strong>{num}</strong><span>{label}</span></article>; }
function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) { return <div className="veil" role="dialog" aria-modal="true"><section className="modal"><header><div><p className="eyebrow">LISTA DO ÔNIBUS</p><h2>{title}</h2></div><button onClick={close} className="close">×</button></header>{children}</section></div>; }
function Input({ label, value, onChange, type = 'text', required = false, wide = false, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; wide?: boolean; placeholder?: string }) { return <label className={'field ' + (wide ? 'wide' : '')}>{label}{required && ' *'}<input type={type} required={required} value={value} placeholder={placeholder} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} onChange={event => onChange(event.target.value)} /></label>; }
function Select({ label, value, onChange, options, required = false }: { label: string; value: string; onChange: (value: string) => void; options: string[]; required?: boolean }) { return <label className="field">{label}{required && ' *'}<select required={required} value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option}>{option}</option>)}</select></label>; }
function FormFooter({ close, text }: { close: () => void; text: string }) { return <div className="form-footer"><button type="button" className="secondary" onClick={close}>Cancelar</button><button className="primary">{text}</button></div>; }
function Empty({ text }: { text: string }) { return <p className="empty-copy">{text}</p>; }
function Login({ onSubmit }: { onSubmit: (username: string, password: string) => Promise<void> }) { const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [sending, setSending] = useState(false); const submit = async (event: FormEvent) => { event.preventDefault(); setSending(true); setError(''); try { await onSubmit(username, password); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.'); } finally { setSending(false); } }; return <main className="login-page"><section className="login-card"><div className="login-mark">EJJ</div><p className="eyebrow">LISTA DO ÔNIBUS</p><h1>Entre para organizar as vagas.</h1><p>Pessoas, pagamentos e cobranças em um só lugar.</p><form onSubmit={submit}><label>Usuário<input autoFocus value={username} onChange={event => setUsername(event.target.value)} required /></label><label>Senha<input type="password" value={password} onChange={event => setPassword(event.target.value)} required /></label>{error && <div className="login-error">{error}</div>}<button className="login-button" disabled={sending}>{sending ? 'Entrando…' : 'Entrar'}</button></form></section></main>; }
