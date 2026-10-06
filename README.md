# Fretamentos EJJ — Baixo Guandu

Aplicação para registrar empresas de ônibus e comparar orçamentos da viagem.

## Regras do sistema

- **Empresa** registra somente: nome do contato, empresa, tamanho do ônibus e tipo (Executivo ou Convencional).
- **Orçamento** é vinculado a uma empresa e guarda a disponibilidade naquela viagem, existência de ônibus reserva, valor, pagamento e status.
- Uma empresa sem disponibilidade é automaticamente marcada como **Indisponível**.
- Apenas uma proposta disponível pode permanecer como **Selecionada**.

## Publicar na Vercel com banco de dados

1. Importe este repositório na Vercel.
2. Em **Storage**, instale a integração **Neon** e conecte-a a este projeto. A Vercel cria `DATABASE_URL` automaticamente.
3. No console SQL do Neon, execute o conteúdo de [`db/schema.sql`](./db/schema.sql).
4. Faça um novo deploy.

Para executar localmente, crie `.env.local` com sua `DATABASE_URL`, instale as dependências com `npm install` e rode `npm run dev`.

## Acesso inicial

- Usuário: `admin`
- Senha: `admin`

Antes de tornar o sistema público, defina `ADMIN_USER`, `ADMIN_PASSWORD` e uma `SESSION_SECRET` longa nas variáveis de ambiente da Vercel.
