CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  bus_size INTEGER NOT NULL CHECK (bus_size > 0),
  bus_type TEXT NOT NULL CHECK (bus_type IN ('Executivo', 'Convencional')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE UNIQUE INDEX IF NOT EXISTS one_selected_quote
  ON quotes ((status)) WHERE status = 'Selecionada';
CREATE INDEX IF NOT EXISTS quotes_company_id_idx ON quotes(company_id);
