'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './boarding.module.css';

type FormInfo = { name: string; points: string[] };

export default function BoardingForm() {
  const params = useParams<{ id: string }>();
  const [info, setInfo] = useState<FormInfo | null>(null);
  const [fullName, setFullName] = useState('');
  const [boardingPoint, setBoardingPoint] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'sending' | 'done' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => { fetch(`/api/boarding/${params.id}`).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setInfo(data); setState('ready'); }).catch(error => { setMessage(error instanceof Error ? error.message : 'Não foi possível abrir o formulário.'); setState('error'); }); }, [params.id]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setState('sending'); setMessage(''); try { const response = await fetch(`/api/boarding/${params.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName, boardingPoint }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setState('done'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível enviar.'); setState('ready'); } };

  return <main className={styles.page}><section className={styles.card}><div className={styles.brand}><span>EJJ</span><b>Ônibus</b></div>{state === 'loading' && <p className={styles.note}>Carregando formulário…</p>}{state === 'error' && <div className={styles.error}>{message}</div>}{state === 'done' && <div className={styles.done}><p>EMBARQUE REGISTRADO</p><h1>Obrigado!</h1><span>Seu ponto de embarque foi enviado para a equipe.</span></div>}{(state === 'ready' || state === 'sending') && info && <><p className={styles.kicker}>CONFIRMAÇÃO DE EMBARQUE</p><h1>{info.name}</h1><p className={styles.intro}>Preencha seus dados para informar onde você vai embarcar.</p><form onSubmit={submit}><label>Nome completo<input required autoFocus value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Digite seu nome completo" /></label><label>Local de embarque<select required value={boardingPoint} onChange={event => setBoardingPoint(event.target.value)}><option value="">Selecione o local</option>{info.points.map(point => <option key={point} value={point}>{point}</option>)}</select></label>{message && <div className={styles.error}>{message}</div>}<button disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Confirmar embarque'}</button></form><p className={styles.privacy}>O formulário só coleta seu nome e local de embarque.</p></>}</section></main>;
}
