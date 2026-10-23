# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-page calisthenics workout tracking app ("Muscle Up") built with React + TypeScript + Vite. Data lives in
the **hub** — the shared Supabase project also used by the `ricettario` app — in its own schema
(`calisthenics`). Authentication is **email + password** (Supabase Auth), same account as `ricettario`:
one person, one login, shared across apps. Deployed on **Vercel**.

**Repo:** https://github.com/Trevizanzan/calisthenics-tracker

### History: migrated off its own Supabase project (27/07)

This app used to run on its own free-tier Supabase project (`qlpgamffiswavfmouhhk`, region `eu-west-1`).
That project went `INACTIVE` (auto-paused after 7 days without traffic) and was never revived — moving
into the hub was cheaper than reviving it, since the free tier caps active projects at 2 and the hub
already hosts `ricettario`. The old project is left paused as a historical backup; nothing points to it
anymore. `supabase/migrations/001_initial.sql` and `002_keepalive.sql` describe that old project's
schema — kept for reference, not applied anywhere live.

**Why the migration was low-effort:** the client only ever depended on two env vars
(`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) and a schema name — no edge functions, no storage
bucket, no RPC calls. Moving meant: recreate the two tables under a new schema, point the client at
the hub with `db: { schema: 'calisthenics' }`, and swap Google OAuth for email+password (the hub has
registrations disabled, so the account is created once from the dashboard, not through a sign-up flow).
Old `user_id` values weren't migrated — only one person used the app, so a fresh start cost nothing.

**Its own keep-alive is gone.** The hub is already kept alive by `ricettario`'s daily Supabase ping and
monthly GitHub-Actions-activity commit (see `ricettario/PROGETTO.md`, section "Keepalive"). This repo's
own `.github/workflows/keepalive.yml` and the `calisthenics-tracker-keepalive-commit` monthly routine
pinged the *old* standalone project — both should be removed/disabled once the app moves to the hub,
otherwise they run against a project nobody reads from anymore.

## Design System

Lo stile originale è il tema **Neon** in modalità notte, ed è il predefinito. Va preservato così com'è:

- **Background:** `#0a0a0a`
- **Accent:** `#d4ff3a` (neon yellow)
- **Warm:** `#ff7a45` (orange), **Cool:** `#5dc4ff` (blue), **Danger:** `#ff5470` (red)
- **Fonts:** "Bricolage Grotesque" (body) + "JetBrains Mono" (monospace)
- Mobile-first responsive layout

Dal 21/10 (richiesta esplicita) dal menu ⋯ si scelgono anche altri temi, la modalità giorno/notte/auto
e la dimensione del testo. Come funziona:

- `src/temi.css` definisce tutti i colori, i font e i raggi come variabili su `<html>`, per
  `data-tema` (neon | oceano | brace | lavanda) e `data-modo` (scuro | chiaro). Ogni tema ha la sua
  coppia di font: Oceano = Space Grotesk + IBM Plex Mono, Brace = Archivo + Space Mono, Lavanda =
  Fraunces + DM Mono.
- `src/styles.css` **non contiene colori o font letterali**: solo `var(--…)`, e le tinte trasparenti
  con `color-mix(in srgb, var(--accent) 12%, transparent)`. Un colore scritto a mano lì romperebbe
  gli altri temi. Il testo sopra lo sfondo accento usa `--on-accent`, non `--bg`.
- Le dimensioni dei testi sono in `rem`: `html { font-size: calc(100% * var(--scala)) }` le scala
  tutte insieme (85%–135%).
- `src/lib/aspetto.ts` salva la scelta in localStorage (`muscleup:aspetto`, preferenza del
  dispositivo) e scarica i font di un tema solo quando serve. Lo script in testa a `index.html`
  applica gli stessi attributi prima del primo disegno, per evitare il lampo del tema predefinito.

## Running Locally

```bash
npm install
# .env.local already points to the hub (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY);
# .env.example mirrors it since both values are public by design (publishable key).
npm run dev   # Vite dev server
npm run build # production build → dist/
```

## Architecture

React 18 + TypeScript + Vite (v3, 21/10/2026 — riscritta da vanilla JS, stessa impostazione di
`ricettario` e `spese`).

```
index.html                — solo <div id="root">: prima del login la pagina non contiene altro
src/
  main.tsx                — monta <App />
  App.tsx                 — cancello di login (useSessione) + AppAutenticata: carica dati, viste, toast
  types.ts                — Esercizio, Allenamento, Serie, Bozza
  temi.css                — variabili di colori/font/raggi per ogni tema e modalità
  styles.css              — tutti gli stili, solo con variabili (classi della v2 riusate + nuove in fondo)
  lib/supabase.ts         — client sullo schema `calisthenics`
  lib/dati.ts             — tutte le letture/scritture su Supabase
  lib/bozza.ts            — bozza dell'allenamento in localStorage, raggruppamento serie, "ultima volta"
  lib/categorie.ts        — le 6 categorie (tirata, spinta, gambe, core, skill, mobilità)
  lib/date.ts             — data locale (non UTC) e formattazione italiana
  lib/aspetto.ts          — temi, modalità, scala del testo (localStorage)
  components/
    Login.tsx             — schermata di accesso a pagina intera
    NuovoAllenamento.tsx  — data, esercizi scelti con le loro serie, note, salva
    SceltaEsercizio.tsx   — catalogo per categoria con ricerca, riordino manuale (⇅ ordina),
                            creazione di un esercizio proprio
    ContatorePullup.tsx   — pull-up giornalieri, salvataggio con debounce 1s
    Storico.tsx           — giorni con allenamenti/pull-up; ogni allenamento si espande/comprime
                            (aperto solo il più recente, più "espandi/comprimi tutti"), "ripeti", "elimina"
    Navigazione.tsx       — barra in basso
    Menu.tsx              — menu ⋯: modalità, tema, dimensione testo, esci
supabase/migrations/
  001, 002                — storiche: il vecchio progetto standalone, non applicate da nessuna parte
  003_catalogo_esercizi   — applicata sull'hub: catalogo, allenamenti, serie, pull-up
  004_ordine_esercizi     — applicata sull'hub: ordine manuale degli esercizi per utente
```

### Flusso

1. Senza sessione si monta solo `<Login />`: nessun dato viene richiesto.
2. Con la sessione → in parallelo `esercizi`, `allenamenti` (con `serie` annidate) e
   `pullup_giornalieri`.
3. L'allenamento si compone scegliendo esercizi dal catalogo; per ciascuno si scrivono le serie
   (ripetizioni o secondi, +kg se l'esercizio ammette zavorra). La bozza resta in localStorage
   (`muscleup:bozza`) finché non si salva, così chiudere l'app a metà non perde niente.
4. Salvare = una riga in `allenamenti` + una riga per serie in `serie` (le serie vuote si scartano).
   Se le serie falliscono, l'allenamento appena creato viene cancellato.
5. Sotto ogni esercizio scelto compare cosa si era fatto l'ultima volta, calcolato dallo storico
   già caricato.

### Schema `calisthenics` sull'hub

**`esercizi`** — catalogo. `user_id` null = template (55 esercizi, visibili a ogni utente loggato);
valorizzato = esercizio creato da quell'utente, visibile solo a lui.
`nome`, `categoria` (spinta|tirata|gambe|core|skill|mobilita), `descrizione`, `misura` (rip|sec),
`zavorra` (bool).

**`allenamenti`** — `id`, `user_id`, `data` (date), `note`, `created_at`.

**`serie`** — `allenamento_id` (cascade), `user_id`, `esercizio_id` (restrict), `ordine`,
`ripetizioni` | `secondi`, `kg`.

**`pullup_giornalieri`** — PK (`user_id`, `data`), `conteggio`.

**`ordine_esercizi`** — PK (`user_id`, `esercizio_id`), `posizione`. Per utente perché il template è
condiviso. Si riscrive un'intera categoria a ogni spostamento; senza righe vale l'ordine alfabetico,
e gli esercizi senza posizione (es. appena creati) vanno in fondo.

RLS ovunque, solo per `authenticated`: `anon` non ha nemmeno l'uso dello schema. La policy di `serie`
verifica anche che l'allenamento sia dell'utente. Collaudato il 21/10: anon → permission denied;
un altro utente vede i 55 esercizi del template e nient'altro.

**Tabelle della v2, non più lette:** `logs` e `sessions_config`. Restano intatte; i 2 conteggi di
pull-up sono stati copiati in `pullup_giornalieri`, l'unico allenamento (28/07, formato A/B/C) no.

## Key Constraints

- **Env vars** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be set — locally in `.env.local`,
  on Vercel in the project dashboard. Both are public by design (publishable key + RLS is what actually
  protects the data), so the same values live in `.env.example`.
- **Login is email + password**, matching `ricettario`'s `Login.tsx` pattern: generic error message on
  failure (doesn't reveal whether the email exists), no sign-up path — registrations are disabled on
  the hub, accounts are created from the Supabase dashboard.
- All UI text is in Italian.
- The app is functional on both desktop and mobile.
- **Il login è un cancello:** senza sessione si vede solo la schermata di accesso. Le parti dell'app
  autenticata non vanno mai rese prima del login.

## Icona

Logo: gli **anelli** da ginnastica arancio su `#141414`, con l'anellino bianco come le altre app
dell'hub (proposta "02 · Anelli", vedi `app-personale/docs/loghi/icona-muscle-up.html`).
- `public/icon-maskable.svg`: icona Android intera; il launcher mostra solo il cerchio centrale
  (raggio 21,33 su 64), l'anello bianco è a r 20,875.
- `public/icon.svg` e `public/favicon.svg`: la zona visibile sul Pixel, per il web.
- I PNG (`icon-maskable-192/512`, `icon-192/512`, `apple-touch-icon`) sono renderizzati dagli SVG
  con Chrome headless; `public/manifest.webmanifest` li dichiara (maskable in cima).
