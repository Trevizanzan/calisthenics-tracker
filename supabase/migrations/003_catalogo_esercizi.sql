-- Applicata sull'hub (schema `calisthenics`), non sul vecchio progetto.
--
-- Sostituisce le sessioni A/B/C fisse con un catalogo di esercizi diviso per
-- categoria: un allenamento è una data più una lista di serie, ognuna legata a
-- un esercizio del catalogo. Le vecchie tabelle `logs` e `sessions_config`
-- restano dove sono, intatte: la nuova app non le legge più.

-- ========== CATALOGO ==========
-- user_id null = esercizio del template, visibile a tutti gli utenti loggati.
-- user_id valorizzato = esercizio aggiunto da quell'utente, visibile solo a lui.
create table calisthenics.esercizi (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  nome        text not null,
  categoria   text not null check (categoria in ('spinta','tirata','gambe','core','skill','mobilita')),
  descrizione text,
  misura      text not null default 'rip' check (misura in ('rip','sec')),
  zavorra     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ========== ALLENAMENTI ==========
create table calisthenics.allenamenti (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  data       date not null,
  note       text,
  created_at timestamptz not null default now()
);
create index allenamenti_user_data on calisthenics.allenamenti (user_id, data desc);

-- Una riga per serie. ripetizioni o secondi a seconda della misura
-- dell'esercizio; kg solo se l'esercizio ammette zavorra.
create table calisthenics.serie (
  id             uuid primary key default gen_random_uuid(),
  allenamento_id uuid not null references calisthenics.allenamenti on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  esercizio_id   uuid not null references calisthenics.esercizi on delete restrict,
  ordine         int  not null,
  ripetizioni    int,
  secondi        int,
  kg             numeric(5,2)
);
create index serie_allenamento on calisthenics.serie (allenamento_id, ordine);
create index serie_esercizio on calisthenics.serie (user_id, esercizio_id);

-- ========== PULL-UP GIORNALIERI ==========
create table calisthenics.pullup_giornalieri (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  data       date not null,
  conteggio  int  not null check (conteggio >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, data)
);

insert into calisthenics.pullup_giornalieri (user_id, data, conteggio)
select user_id, date::date, count from calisthenics.logs where type = 'pullups' and count is not null
on conflict do nothing;

-- ========== PERMESSI ==========
-- Solo `authenticated`: senza login non si legge nemmeno il catalogo.
grant select, insert, update, delete on calisthenics.esercizi, calisthenics.allenamenti,
  calisthenics.serie, calisthenics.pullup_giornalieri to authenticated;

alter table calisthenics.esercizi           enable row level security;
alter table calisthenics.allenamenti        enable row level security;
alter table calisthenics.serie              enable row level security;
alter table calisthenics.pullup_giornalieri enable row level security;

create policy "catalogo e propri" on calisthenics.esercizi for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "propri: scrivi" on calisthenics.esercizi for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "propri: modifica" on calisthenics.esercizi for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "propri: elimina" on calisthenics.esercizi for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "propri" on calisthenics.allenamenti for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- La serie deve stare in un allenamento proprio: senza il controllo si potrebbe
-- agganciare una serie all'allenamento di un altro conoscendone l'id.
create policy "proprie" on calisthenics.serie for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from calisthenics.allenamenti a
                where a.id = allenamento_id and a.user_id = (select auth.uid()))
  );

create policy "propri" on calisthenics.pullup_giornalieri for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ========== TEMPLATE ==========
insert into calisthenics.esercizi (categoria, nome, descrizione, misura, zavorra) values
  -- tirata
  ('tirata', 'Pull-up',                          'presa prona, mento sopra la sbarra',              'rip', true),
  ('tirata', 'Chin-up',                          'presa supina',                                    'rip', true),
  ('tirata', 'Pull-up esplosivi al petto',       'solo rep di qualità: se cali al mento, stop',     'rip', false),
  ('tirata', 'Pull-up con pausa al mento',       'tieni 2 sec in cima',                             'rip', true),
  ('tirata', 'Pull-up negativi',                 'eccentrica lenta, 4-5 sec',                       'rip', true),
  ('tirata', 'Pull-up assistiti (elastico)',     'annota l''elastico nelle note',                   'rip', false),
  ('tirata', 'Scapular pull-up',                 'solo depressione e retrazione scapolare',         'rip', false),
  ('tirata', 'Australian pull-up',               'rematore inverso alla sbarra bassa',              'rip', false),
  ('tirata', 'Archer pull-up',                   'un braccio tira, l''altro accompagna',            'rip', false),
  ('tirata', 'Typewriter pull-up',               'in cima, scorri da un lato all''altro',           'rip', false),
  ('tirata', 'Dead hang',                        'appeso a braccia tese',                           'sec', true),
  ('tirata', 'False grip hang',                  'polso sopra la sbarra',                           'sec', false),
  -- spinta
  ('spinta', 'Push-up',                          'corpo in linea, petto a terra',                   'rip', true),
  ('spinta', 'Diamond push-up',                  'mani vicine, gomiti stretti',                     'rip', false),
  ('spinta', 'Archer push-up',                   'un braccio spinge, l''altro resta teso',          'rip', false),
  ('spinta', 'Push-up esplosivi',                'mani che si staccano da terra',                   'rip', false),
  ('spinta', 'Pseudo planche push-up',           'mani all''altezza dei fianchi, spalle avanti',    'rip', false),
  ('spinta', 'Pike push-up',                     'anche alte, testa verso terra',                   'rip', false),
  ('spinta', 'Pike push-up piedi rialzati',      'busto quasi verticale',                           'rip', false),
  ('spinta', 'Dip alle parallele',               'scendi fino a spalla sotto il gomito',            'rip', true),
  ('spinta', 'Dip alla sbarra',                  'simula la fase finale del muscle up',             'rip', true),
  ('spinta', 'Handstand push-up al muro',        'testa a terra, ritorno a braccia tese',           'rip', false),
  -- gambe
  ('gambe',  'Squat',                            'a corpo libero, fino in fondo',                   'rip', true),
  ('gambe',  'Jump squat',                       'esplosivo, atterraggio morbido',                  'rip', false),
  ('gambe',  'Affondi',                          'alternati, ginocchio sfiora terra',               'rip', true),
  ('gambe',  'Bulgarian split squat',            'piede dietro rialzato',                           'rip', true),
  ('gambe',  'Shrimp squat',                     'piede dietro tenuto con la mano',                 'rip', false),
  ('gambe',  'Pistol squat assistito',           'tieniti a un appoggio',                           'rip', false),
  ('gambe',  'Pistol squat',                     'su una gamba, l''altra tesa avanti',              'rip', true),
  ('gambe',  'Nordic curl negativi',             'scendi il più lento possibile',                   'rip', false),
  ('gambe',  'Glute bridge monopodalico',        'spingi col tallone',                              'rip', false),
  ('gambe',  'Calf raise',                       'su un gradino, escursione completa',              'rip', true),
  -- core
  ('core',   'Hollow body hold',                 'zona lombare a terra',                            'sec', false),
  ('core',   'Arch hold',                        'il contrario dell''hollow, glutei attivi',        'sec', false),
  ('core',   'Plank',                            'bacino in linea',                                 'sec', false),
  ('core',   'L-sit',                            'alle parallele o a terra',                        'sec', false),
  ('core',   'Hanging knee raise',               'ginocchia al petto senza dondolare',              'rip', false),
  ('core',   'Hanging leg raise',                'gambe tese fino a 90°',                           'rip', false),
  ('core',   'Toes to bar',                      'piedi alla sbarra',                               'rip', false),
  ('core',   'Dragon flag negativi',             'scendi rigido come una tavola',                   'rip', false),
  -- skill
  ('skill',  'Muscle up',                        'trazione esplosiva, transizione, spinta',         'rip', false),
  ('skill',  'Muscle up negativi',               'dalla posizione alta, scendi controllato',        'rip', false),
  ('skill',  'Transizione muscle up (elastico)', 'lavora solo il passaggio sopra la sbarra',        'rip', false),
  ('skill',  'Handstand al muro',                'pancia al muro, corpo allineato',                 'sec', false),
  ('skill',  'Handstand libero',                 'senza appoggio',                                  'sec', false),
  ('skill',  'Tuck front lever',                 'ginocchia al petto, schiena orizzontale',         'sec', false),
  ('skill',  'Tuck back lever',                  'passa da skin the cat',                           'sec', false),
  ('skill',  'Planche lean',                     'spalle oltre le mani, braccia tese',              'sec', false),
  ('skill',  'Tuck planche',                     'ginocchia al petto, piedi staccati',              'sec', false),
  -- mobilità
  ('mobilita', 'Mobilità polsi',                 'circle lenti + stretch in estensione',            'sec', false),
  ('mobilita', 'Stretching polsi',               'passivo, in estensione e flessione',              'sec', false),
  ('mobilita', 'Shoulder dislocates',            'con elastico o bastone, braccia tese',            'rip', false),
  ('mobilita', 'Skin the cat',                   'rotazione completa alla sbarra',                  'rip', false),
  ('mobilita', 'German hang',                    'tieni la posizione finale di skin the cat',       'sec', false),
  ('mobilita', 'Deep squat hold',                'accosciata profonda, talloni a terra',            'sec', false);
