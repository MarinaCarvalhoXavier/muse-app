-- Muse — adiciona "subtipo" (detalhe do tipo, ex: Regata dentro de "Parte de cima")
-- Rode isso no SQL Editor do seu projeto Supabase (Database > SQL Editor > New query).
-- É seguro rodar mesmo já tendo peças salvas: só adiciona uma coluna nova e
-- reorganiza os tipos que já existem pras novas categorias.

alter table pieces add column if not exists subtipo text;

-- Reorganiza os tipos antigos (mais específicos) pras novas categorias
-- principais, guardando o valor antigo como subtipo.
update pieces set tipo = 'Parte de cima', subtipo = 'Blusa' where tipo = 'Blusas';
update pieces set tipo = 'Parte de baixo', subtipo = 'Calça' where tipo = 'Calças';
update pieces set tipo = 'Parte de baixo', subtipo = 'Saia curta' where tipo = 'saia curta';
update pieces set tipo = 'Bolsas', subtipo = null where tipo = 'bolsa';
-- "Sapatos" e "Acessórios" já têm o mesmo nome na categoria nova, não precisam mudar.
