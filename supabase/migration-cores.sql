-- Muse — migração: "Cor" vira multi-seleção (uma peça pode ter mais de uma
-- cor predominante, ex: uma camisa xadrez preta e branca). Rode no SQL
-- Editor do Supabase (Database > SQL Editor > New query > Run).

alter table pieces add column if not exists cores text[] not null default '{}';
update pieces set cores = array[cor] where cor is not null and cardinality(cores) = 0;
alter table pieces drop column if exists cor;
