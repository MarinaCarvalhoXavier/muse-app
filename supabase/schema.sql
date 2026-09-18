-- Muse — schema inicial (peças e outfits)
-- Rode isso no SQL Editor do seu projeto Supabase (Database > SQL Editor > New query)

create table if not exists pieces (
  id uuid primary key,
  tipo text not null,
  subtipos text[] not null default '{}',
  ocasioes text[] not null default '{}',
  cor text not null,
  estacoes text[] not null default '{}',
  favorita boolean not null default false,
  marca text,
  notas text,
  estampa text,
  foto_url text,
  criada_em timestamptz not null default now()
);

create table if not exists outfits (
  id uuid primary key,
  nome text not null,
  itens jsonb not null default '[]',
  criado_em timestamptz not null default now()
);

-- Row Level Security: como o app ainda não tem login (é só você usando),
-- liberamos leitura e escrita pra quem tiver a chave publishable.
-- Quando o app tiver autenticação de verdade, essas políticas devem
-- restringir por usuário (ex: usando auth.uid()).
alter table pieces enable row level security;
alter table outfits enable row level security;

create policy "Permitir tudo (sem auth por enquanto)" on pieces
  for all using (true) with check (true);

create policy "Permitir tudo (sem auth por enquanto)" on outfits
  for all using (true) with check (true);
