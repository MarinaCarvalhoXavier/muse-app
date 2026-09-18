-- Muse — bucket de Storage para fotos das peças
-- Rode isso no SQL Editor do seu projeto Supabase (Database > SQL Editor > New query)

insert into storage.buckets (id, name, public)
values ('fotos-pecas', 'fotos-pecas', true)
on conflict (id) do nothing;

-- Sem auth ainda, então liberamos leitura/escrita pra quem tiver a chave publishable
-- (mesmo raciocínio das políticas em schema.sql — quando tiver login de verdade,
-- isso deve restringir por usuário).
create policy "Permitir tudo em fotos-pecas (sem auth por enquanto)"
on storage.objects for all
using (bucket_id = 'fotos-pecas')
with check (bucket_id = 'fotos-pecas');
