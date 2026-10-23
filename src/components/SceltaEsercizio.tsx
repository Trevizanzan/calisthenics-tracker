import { useEffect, useState, type FormEvent } from 'react'
import type { Categoria, Esercizio, Misura } from '../types'
import { CATEGORIE, NOME_CATEGORIA } from '../lib/categorie'
import { creaEsercizio, ordina } from '../lib/dati'

type Props = {
  userId: string
  esercizi: Esercizio[]
  ordine: Record<string, number>
  onRiordina: (ids: string[]) => void
  /** Esercizi già nell'allenamento in corso. */
  scelti: Set<string>
  /** Tocco su un esercizio: lo aggiunge, o lo toglie se c'è già. */
  onAlterna: (id: string) => void
  /** Esercizio appena creato: va aggiunto, non alternato. */
  onAggiungi: (id: string) => void
  onNuovo: (e: Esercizio) => void
  avvisa: (testo: string, errore?: boolean) => void
}

const CHIAVE_CATEGORIA = 'muscleup:categoria'

function categoriaIniziale(): Categoria {
  try {
    const c = localStorage.getItem(CHIAVE_CATEGORIA)
    if (CATEGORIE.some((x) => x.id === c)) return c as Categoria
  } catch { /* nessuna memoria: si parte dalla prima */ }
  return 'tirata'
}

export function SceltaEsercizio(p: Props) {
  const [categoria, setCategoria] = useState<Categoria>(categoriaIniziale)
  const [cerca, setCerca] = useState('')
  const [creazione, setCreazione] = useState(false)
  const [riordino, setRiordino] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(CHIAVE_CATEGORIA, categoria) } catch { /* idem */ }
  }, [categoria])

  const testo = cerca.trim().toLowerCase()
  // Con un testo di ricerca si cerca in tutte le categorie: chi scrive "dip"
  // non deve sapere prima che sta sotto Spinta.
  const visibili = ordina(
    p.esercizi.filter((e) => (testo ? e.nome.toLowerCase().includes(testo) : e.categoria === categoria)),
    p.ordine
  )
  // Si riordina solo dentro una categoria: con una ricerca la lista mescola
  // categorie diverse e spostare non avrebbe un significato chiaro.
  const inRiordino = riordino && !testo

  const sposta = (i: number, verso: -1 | 1) => {
    const ids = visibili.map((e) => e.id)
    const j = i + verso
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    p.onRiordina(ids)
  }

  // Quanti esercizi scelti per categoria, sulle linguette.
  const perCategoria: Partial<Record<Categoria, number>> = {}
  for (const e of p.esercizi) if (p.scelti.has(e.id)) perCategoria[e.categoria] = (perCategoria[e.categoria] ?? 0) + 1

  return (
    <section className="catalogo" aria-label="Esercizi">
        <div className="catalogo-titolo">// esercizi <span>tocca per aggiungere o togliere</span></div>

        <div className="picker-search">
          <input className="editor-input" type="search" placeholder="cerca..." value={cerca} onChange={(e) => setCerca(e.target.value)} />
        </div>

        {!testo && (
          <div className="cat-tabs">
            <button className={`cat-tab riordina ${riordino ? 'active' : ''}`} onClick={() => setRiordino((r) => !r)}
              aria-pressed={riordino} title="Riordina gli esercizi">
              {riordino ? '✓ fatto' : '⇅ ordina'}
            </button>
            {CATEGORIE.map((c) => (
              <button key={c.id} className={`cat-tab ${c.id === categoria ? 'active' : ''}`} onClick={() => setCategoria(c.id)}>
                {c.nome}
                {perCategoria[c.id] ? <span className="cat-conta">{perCategoria[c.id]}</span> : null}
              </button>
            ))}
          </div>
        )}

        <div className="picker-list">
          {visibili.length === 0 && <div className="history-empty">nessun esercizio</div>}
          {inRiordino && visibili.map((e, i) => (
            <div key={e.id} className="picker-item riordino">
              <span className="picker-name">{e.nome}</span>
              <span className="ex-tools">
                <button className="icon-btn" onClick={() => sposta(i, -1)} disabled={i === 0} aria-label={`Sposta su ${e.nome}`}>↑</button>
                <button className="icon-btn" onClick={() => sposta(i, 1)} disabled={i === visibili.length - 1} aria-label={`Sposta giù ${e.nome}`}>↓</button>
              </span>
            </div>
          ))}
          {!inRiordino && visibili.map((e) => {
            const scelto = p.scelti.has(e.id)
            return (
            <button key={e.id} className={`picker-item ${scelto ? 'scelto' : ''}`} onClick={() => p.onAlterna(e.id)} aria-pressed={scelto}>
              <span className="picker-segno" aria-hidden>{scelto ? '✓' : '+'}</span>
              <span className="picker-name">
                {e.nome}
                {e.user_id && <span className="picker-badge mio">mio</span>}
              </span>
              <span className="picker-meta">
                {testo && `${NOME_CATEGORIA[e.categoria]} · `}
                {e.misura === 'rip' ? 'ripetizioni' : 'secondi'}{e.zavorra && ' · +kg'}
                {e.descrizione && ` — ${e.descrizione}`}
              </span>
            </button>
            )
          })}
        </div>

        <div className="catalogo-footer">
          {creazione ? (
            <NuovoEsercizio
              categoria={categoria}
              nomeIniziale={cerca.trim()}
              onAnnulla={() => setCreazione(false)}
              onCrea={async (campi) => {
                try {
                  const e = await creaEsercizio(p.userId, campi)
                  p.onNuovo(e)
                  p.onAggiungi(e.id)
                  setCreazione(false)
                  setCerca('')
                } catch {
                  p.avvisa('Esercizio non creato', true)
                }
              }}
            />
          ) : (
            <button className="editor-add-btn" onClick={() => setCreazione(true)}>+ crea un esercizio nuovo</button>
          )}
        </div>
    </section>
  )
}

type Campi = { nome: string; categoria: Categoria; misura: Misura; zavorra: boolean; descrizione: string | null }

function NuovoEsercizio(p: {
  categoria: Categoria
  nomeIniziale: string
  onAnnulla: () => void
  onCrea: (c: Campi) => Promise<void>
}) {
  const [nome, setNome] = useState(p.nomeIniziale)
  const [categoria, setCategoria] = useState(p.categoria)
  const [misura, setMisura] = useState<Misura>('rip')
  const [zavorra, setZavorra] = useState(false)
  const [descrizione, setDescrizione] = useState('')
  const [inCorso, setInCorso] = useState(false)

  const invia = async (e: FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    setInCorso(true)
    await p.onCrea({ nome: nome.trim(), categoria, misura, zavorra, descrizione: descrizione.trim() || null })
    setInCorso(false)
  }

  return (
    <form className="ex-form-grid" onSubmit={invia}>
      <div className="ex-form-field">
        <label htmlFor="nuovo-nome">nome</label>
        <input id="nuovo-nome" className="editor-input" value={nome} required autoFocus onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="ex-form-field">
        <label htmlFor="nuovo-desc">descrizione</label>
        <input id="nuovo-desc" className="editor-input" value={descrizione} placeholder="facoltativa" onChange={(e) => setDescrizione(e.target.value)} />
      </div>
      <div className="ex-form-row">
        <div className="ex-form-field">
          <label htmlFor="nuovo-cat">categoria</label>
          <select id="nuovo-cat" className="editor-input" value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
            {CATEGORIE.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="ex-form-field">
          <label htmlFor="nuovo-misura">si misura in</label>
          <select id="nuovo-misura" className="editor-input" value={misura} onChange={(e) => setMisura(e.target.value as Misura)}>
            <option value="rip">ripetizioni</option>
            <option value="sec">secondi</option>
          </select>
        </div>
      </div>
      <label className="ex-form-check">
        <input type="checkbox" checked={zavorra} onChange={(e) => setZavorra(e.target.checked)} /> si può fare con zavorra (kg)
      </label>
      <div className="ex-form-actions">
        <button className="btn-primary" type="submit" disabled={inCorso}>Crea e aggiungi</button>
        <button className="btn-secondary" type="button" onClick={p.onAnnulla}>Annulla</button>
      </div>
    </form>
  )
}
