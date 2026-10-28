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
    boarding_points TEXT NOT NULL DEFAULT '14:00 — Shopping Moxuara (Av. Mário Gurgel, 5353 - São Francisco, Cariacica)\n14:30 — UFES (Goiabeiras / Vitória)\n15:10 — Supermercado BH Laranjeiras (BR-101 / Serra)\n15:40 — Rodoviária da Serra',
    travel_started_at TIMESTAMPTZ,
    travel_moving_at TIMESTAMPTZ,
    moving_seconds INTEGER NOT NULL DEFAULT 0 CHECK (moving_seconds >= 0),
    travel_ended_at TIMESTAMPTZ,
    active_boarding_point TEXT,
    point_arrivals JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES passenger_lists(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Reservado a pagar' CHECK (status IN ('Pago', 'Pago parcial', 'Pago pelo pastor', 'Pago Davy', 'Reservado a pagar', 'Suplência')),
    uses_seat BOOLEAN NOT NULL DEFAULT TRUE,
    return_only BOOLEAN NOT NULL DEFAULT FALSE,
    outbound_only BOOLEAN NOT NULL DEFAULT FALSE,
    charge_to TEXT NOT NULL DEFAULT '',
    amount NUMERIC(12,2) NOT NULL DEFAULT 125 CHECK (amount >= 0),
    received_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (received_amount >= 0),
    discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    notes TEXT NOT NULL DEFAULT '',
    attendance_status TEXT NOT NULL DEFAULT 'Pendente' CHECK (attendance_status IN ('Pendente', 'Presente', 'Ausente')),
    attendance_at TIMESTAMPTZ,
    return_attendance_status TEXT NOT NULL DEFAULT 'Pendente' CHECK (return_attendance_status IN ('Pendente', 'Presente', 'Ausente')),
    return_attendance_at TIMESTAMPTZ,
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
  await sql`CREATE TABLE IF NOT EXISTS boarding_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES passenger_lists(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    boarding_point TEXT NOT NULL,
    passenger_id UUID REFERENCES passengers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE passenger_lists ADD COLUMN IF NOT EXISTS bus_total NUMERIC(12,2) NOT NULL DEFAULT 5200 CHECK (bus_total >= 0)`;
  await sql`ALTER TABLE passenger_lists ADD COLUMN IF NOT EXISTS cash_balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cash_balance >= 0)`;
  await sql`ALTER TABLE passenger_lists ADD COLUMN IF NOT EXISTS boarding_points TEXT NOT NULL DEFAULT '14:00 — Shopping Moxuara (Av. Mário Gurgel, 5353 - São Francisco, Cariacica)\n14:30 — UFES (Goiabeiras / Vitória)\n15:10 — Supermercado BH Laranjeiras (BR-101 / Serra)\n15:40 — Rodoviária da Serra'`;
  await sql`ALTER TABLE passenger_lists ADD COLUMN IF NOT EXISTS travel_started_at TIMESTAMPTZ`;
  await sql`ALTER TABLE passenger_lists ADD COLUMN IF NOT EXISTS travel_moving_at TIMESTAMPTZ`;
  await sql`ALTER TABLE passenger_lists ADD COLUMN IF NOT EXISTS moving_seconds INTEGER NOT NULL DEFAULT 0 CHECK (moving_seconds >= 0)`;
  await sql`ALTER TABLE passenger_lists ADD COLUMN IF NOT EXISTS travel_ended_at TIMESTAMPTZ`;
  await sql`ALTER TABLE passenger_lists ADD COLUMN IF NOT EXISTS active_boarding_point TEXT`;
  await sql`ALTER TABLE passenger_lists ADD COLUMN IF NOT EXISTS point_arrivals JSONB NOT NULL DEFAULT '{}'::jsonb`;
  await sql`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0)`;
  await sql`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS received_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (received_amount >= 0)`;
  await sql`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS uses_seat BOOLEAN NOT NULL DEFAULT TRUE`;
  await sql`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS return_only BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS outbound_only BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS attendance_status TEXT NOT NULL DEFAULT 'Pendente' CHECK (attendance_status IN ('Pendente', 'Presente', 'Ausente'))`;
  await sql`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS attendance_at TIMESTAMPTZ`;
  await sql`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS return_attendance_status TEXT NOT NULL DEFAULT 'Pendente' CHECK (return_attendance_status IN ('Pendente', 'Presente', 'Ausente'))`;
  await sql`ALTER TABLE passengers ADD COLUMN IF NOT EXISTS return_attendance_at TIMESTAMPTZ`;
  await sql`ALTER TABLE boarding_responses ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE passengers DROP CONSTRAINT IF EXISTS passengers_status_check`;
  await sql`UPDATE passengers SET status='Pago pelo pastor' WHERE status='Pego pelo pastor'`;
  await sql`UPDATE passengers SET received_amount=amount WHERE received_amount=0 AND status IN ('Pago', 'Pago pelo pastor', 'Pago Davy')`;
  await sql`ALTER TABLE passengers ADD CONSTRAINT passengers_status_check CHECK (status IN ('Pago', 'Pago parcial', 'Pago pelo pastor', 'Pago Davy', 'Reservado a pagar', 'Suplência'))`;
  await sql`CREATE INDEX IF NOT EXISTS passengers_list_id_idx ON passengers(list_id)`;
  await sql`CREATE INDEX IF NOT EXISTS cash_outflows_list_id_idx ON cash_outflows(list_id)`;
  await sql`CREATE INDEX IF NOT EXISTS boarding_responses_list_id_idx ON boarding_responses(list_id)`;
}
