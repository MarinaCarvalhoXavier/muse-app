-- Muse — migração: troca "Estação" (Verão/Inverno/...) por "Peso da peça"
-- (Leve/Neutra/Quente), mais útil pra quem mora em lugar sem estações bem
-- marcadas. Rode no SQL Editor do Supabase (Database > SQL Editor > New
-- query > Run).

alter table pieces add column if not exists peso text;
alter table pieces drop column if exists estacoes;
