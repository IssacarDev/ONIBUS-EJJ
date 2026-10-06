import { neon } from '@neondatabase/serverless';

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não foi configurada. Conecte o Neon no painel da Vercel.');
  return url;
}

export const db = () => neon(databaseUrl());

export function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
