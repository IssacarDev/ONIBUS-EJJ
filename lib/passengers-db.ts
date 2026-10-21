import { db } from '@/lib/db';

/** Creates the passenger area on first use, including a fresh production database. */
export async function ensurePassengerTables() {
  const sql = db();
  await sql`CREATE TABLE IF NOT EXISTS passenger_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 46 CHECK (capacity > 0),
    default_value NUMERIC(12,2) NOT NULL DEFAULT 125 CHECK (default_value >= 0),
    bus_total NUMERIC(12,2) NOT NULL DEFAULT 5200 CHECK (bus_total >= 0),
    cash_balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cash_balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES passenger_lists(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Reservado a pagar' CHECK (status IN ('Pago', 'Pago parcial', 'Pago pelo pastor', 'Pago Davy', 'Reservado a pagar', 'Suplência')),
    charge_to TEXT NOT NULL DEFAULT '',
    amount NUMERIC(12,2) NOT NULL DEFAULT 125 CHECK (amount >= 0),
    received_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (received_amount >= 0),
    discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS cash_outflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES passenger_lists(id) ON DELETE RESTRICT,
    recipient TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE passenger_lists ADD COLUMN IF NOT EXISTS bus_total NUMERIC(12,2) NOT NULL DEFAULT 5200 CHECK (bus_total >= 0)`;
  await sql`ALTER TABLE passenger_lists ADD COLUMN IF NOT EXISTS cash_balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cash_balance >= 0)`;
  await sql`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0)`;
  await sql`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS received_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (received_amount >= 0)`;
  await sql`ALTER TABLE passengers DROP CONSTRAINT IF EXISTS passengers_status_check`;
  await sql`UPDATE passengers SET status='Pago pelo pastor' WHERE status='Pego pelo pastor'`;
  await sql`UPDATE passengers SET received_amount=amount WHERE received_amount=0 AND status IN ('Pago', 'Pago pelo pastor', 'Pago Davy')`;
  await sql`ALTER TABLE passengers ADD CONSTRAINT passengers_status_check CHECK (status IN ('Pago', 'Pago parcial', 'Pago pelo pastor', 'Pago Davy', 'Reservado a pagar', 'Suplência'))`;
  await sql`CREATE INDEX IF NOT EXISTS passengers_list_id_idx ON passengers(list_id)`;
  await sql`CREATE INDEX IF NOT EXISTS cash_outflows_list_id_idx ON cash_outflows(list_id)`;
}
