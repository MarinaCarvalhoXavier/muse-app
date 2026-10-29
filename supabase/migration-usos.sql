-- Muse — migração: registro de "Usei hoje" (cada vez que um look é usado).
-- Rode no SQL Editor do Supabase (SQL Editor > New query > cole tudo > Run).

create table if not exists usos (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references outfits(id) on delete cascade,
  usado_em date not null,
  criado_em timestamptz not null default now(),
  unique (outfit_id, usado_em)
);

alter table usos enable row level security;

drop policy if exists "Permitir tudo (sem auth por enquanto)" on usos;
create policy "Permitir tudo (sem auth por enquanto)" on usos
  for all using (true) with check (true);
