-- Muse — login da dona + modo visitante
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.
--
-- Depois disto:
-- - qualquer pessoa com o link VÊ as peças, looks e usos (modo visitante);
-- - só a conta da Marina (logada no app) consegue criar, editar ou apagar.

-- 1) Tabelas: leitura pública, escrita só da dona
drop policy if exists "Permitir tudo (sem auth por enquanto)" on pieces;
drop policy if exists "Permitir tudo (sem auth por enquanto)" on outfits;
drop policy if exists "Permitir tudo (sem auth por enquanto)" on usos;

drop policy if exists "Leitura pública" on pieces;
drop policy if exists "Leitura pública" on outfits;
drop policy if exists "Leitura pública" on usos;
create policy "Leitura pública" on pieces for select using (true);
create policy "Leitura pública" on outfits for select using (true);
create policy "Leitura pública" on usos for select using (true);

drop policy if exists "Escrita só da dona" on pieces;
drop policy if exists "Escrita só da dona" on outfits;
drop policy if exists "Escrita só da dona" on usos;
create policy "Escrita só da dona" on pieces for all to authenticated
  using (auth.jwt() ->> 'email' = 'marinacvxavier06@gmail.com')
  with check (auth.jwt() ->> 'email' = 'marinacvxavier06@gmail.com');
create policy "Escrita só da dona" on outfits for all to authenticated
  using (auth.jwt() ->> 'email' = 'marinacvxavier06@gmail.com')
  with check (auth.jwt() ->> 'email' = 'marinacvxavier06@gmail.com');
create policy "Escrita só da dona" on usos for all to authenticated
  using (auth.jwt() ->> 'email' = 'marinacvxavier06@gmail.com')
  with check (auth.jwt() ->> 'email' = 'marinacvxavier06@gmail.com');

-- 2) Fotos (Storage): leitura pública, envio/troca/remoção só da dona
drop policy if exists "Permitir tudo em fotos-pecas (sem auth por enquanto)" on storage.objects;
drop policy if exists "Fotos: leitura pública" on storage.objects;
drop policy if exists "Fotos: escrita só da dona" on storage.objects;
create policy "Fotos: leitura pública" on storage.objects for select
  using (bucket_id = 'fotos-pecas');
create policy "Fotos: escrita só da dona" on storage.objects for all to authenticated
  using (bucket_id = 'fotos-pecas' and auth.jwt() ->> 'email' = 'marinacvxavier06@gmail.com')
  with check (bucket_id = 'fotos-pecas' and auth.jwt() ->> 'email' = 'marinacvxavier06@gmail.com');

-- 3) Limite diário de uso da IA por visitante (ex.: 5 sugestões do Stylist por dia).
-- A tabela não tem políticas: ninguém lê ou escreve direto, só pela função abaixo.
create table if not exists limites_visitante (
  visitante text not null,
  acao text not null,
  dia date not null,
  contagem int not null default 0,
  primary key (visitante, acao, dia)
);
alter table limites_visitante enable row level security;

create or replace function contar_uso_visitante(p_visitante text, p_acao text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  insert into limites_visitante (visitante, acao, dia, contagem)
  values (p_visitante, p_acao, (now() at time zone 'America/Recife')::date, 1)
  on conflict (visitante, acao, dia)
  do update set contagem = limites_visitante.contagem + 1
  returning contagem into n;
  return n;
end;
$$;
grant execute on function contar_uso_visitante(text, text) to anon, authenticated;
