CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL DEFAULT '',
  bus_size INTEGER NOT NULL CHECK (bus_size > 0),
  bus_type TEXT NOT NULL CHECK (bus_type IN ('Executivo', 'Convencional')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),
  stops TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  availability TEXT NOT NULL CHECK (availability IN ('Disponível', 'Sem disponibilidade nesta data', 'A confirmar')),
  reserve_bus TEXT NOT NULL CHECK (reserve_bus IN ('Possui ônibus reserva', 'Não possui ônibus reserva', 'Não informado')),
  total_value NUMERIC(12,2),
  deposit_percent NUMERIC(5,2),
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'Solicitada' CHECK (status IN ('Solicitada', 'Recebida', 'Em negociação', 'Selecionada', 'Recusada', 'Indisponível')),
  valid_until DATE,
  proposal_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_winner_per_trip
  ON quotes (trip_id) WHERE status = 'Selecionada';
CREATE INDEX IF NOT EXISTS quotes_trip_id_idx ON quotes(trip_id);
CREATE INDEX IF NOT EXISTS quotes_company_id_idx ON quotes(company_id);

-- Gestão de pessoas / vagas do ônibus
CREATE TABLE IF NOT EXISTS passenger_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 46 CHECK (capacity > 0),
  default_value NUMERIC(12,2) NOT NULL DEFAULT 125 CHECK (default_value >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES passenger_lists(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Reservado a pagar' CHECK (status IN ('Pago', 'Pego pelo pastor', 'Pago Davy', 'Reservado a pagar', 'Suplência')),
  charge_to TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12,2) NOT NULL DEFAULT 125 CHECK (amount >= 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS passengers_list_id_idx ON passengers(list_id);

-- Para bancos que já foram criados antes da opção de suplência.
ALTER TABLE passengers DROP CONSTRAINT IF EXISTS passengers_status_check;
ALTER TABLE passengers ADD CONSTRAINT passengers_status_check CHECK (status IN ('Pago', 'Pego pelo pastor', 'Pago Davy', 'Reservado a pagar', 'Suplência'));
