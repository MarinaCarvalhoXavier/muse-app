-- Muse — migração: outfits passam a guardar os itens do canvas (posição,
-- tamanho e camada de cada peça), em vez da lista antiga de ids + seções.
-- Rode no SQL Editor do Supabase (Database > SQL Editor > New query > Run).

alter table outfits add column if not exists itens jsonb not null default '[]';
alter table outfits drop column if exists peca_ids;
alter table outfits drop column if exists secoes;
