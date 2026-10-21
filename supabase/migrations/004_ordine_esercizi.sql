-- Applicata sull'hub (schema `calisthenics`).
--
-- Ordine manuale degli esercizi dentro ogni categoria, per utente. Sta in una
-- tabella a parte perché gli esercizi del template sono condivisi: l'ordine
-- di uno non deve cambiare quello di un altro. Senza righe qui, una categoria
-- si mostra in ordine alfabetico.
create table calisthenics.ordine_esercizi (
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  esercizio_id uuid not null references calisthenics.esercizi on delete cascade,
  posizione    int  not null,
  primary key (user_id, esercizio_id)
);

grant select, insert, update, delete on calisthenics.ordine_esercizi to authenticated;
alter table calisthenics.ordine_esercizi enable row level security;

create policy "proprio" on calisthenics.ordine_esercizi for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
