import { useState } from 'react'
import type { Allenamento, Esercizio } from '../types'
import { gruppi, testoSerie } from '../lib/bozza'
import { eliminaAllenamento } from '../lib/dati'
import { dataLeggibile } from '../lib/date'
import { NOME_CATEGORIA } from '../lib/categorie'

type Props = {
  storico: Allenamento[]
  catalogo: Map<string, Esercizio>
  pullup: Record<string, number>
  onRipeti: (a: Allenamento) => void
  onEliminato: (id: string) => void
  avvisa: (testo: string, errore?: boolean) => void
}

export function Storico({ storico, catalogo, pullup, onRipeti, onEliminato, avvisa }: Props) {
  // Giorni con un allenamento o con dei pull-up, dal più recente.
  const giorni = [...new Set([...storico.map((a) => a.data), ...Object.keys(pullup).filter((d) => pullup[d] > 0)])]
    .sort()
    .reverse()

  // Di partenza è aperto solo l'allenamento più recente: lo storico lungo si
  // scorre per date, e si apre quello che interessa.
  const [aperti, setAperti] = useState<Set<string>>(() => new Set(storico[0] ? [storico[0].id] : []))
  const tuttiAperti = storico.length > 0 && storico.every((a) => aperti.has(a.id))

  const alterna = (id: string) =>
    setAperti((prima) => {
      const s = new Set(prima)
      if (!s.delete(id)) s.add(id)
      return s
    })

  const elimina = async (a: Allenamento) => {
    if (!confirm(`Eliminare l'allenamento del ${dataLeggibile(a.data)}?`)) return
    try {
      await eliminaAllenamento(a.id)
      onEliminato(a.id)
      avvisa('Allenamento eliminato')
    } catch {
      avvisa('Eliminazione non riuscita', true)
    }
  }

  return (
    <div>
      <div className="history-top">
        <div className="history-title">// storico</div>
        {storico.length > 1 && (
          <button className="log-btn" onClick={() => setAperti(tuttiAperti ? new Set() : new Set(storico.map((a) => a.id)))}>
            {tuttiAperti ? 'comprimi tutti' : 'espandi tutti'}
          </button>
        )}
      </div>
      {giorni.length === 0 && <div className="history-empty">ancora nessun allenamento</div>}
      {giorni.map((g) => (
        <div key={g} className="history-day">
          <div className="history-day-header">
            <span className="history-day-date">{dataLeggibile(g)}</span>
            {pullup[g] > 0 && <span className="pullup-day-badge">{pullup[g]} pull-up</span>}
          </div>
          {storico.filter((a) => a.data === g).map((a) => {
            const aperto = aperti.has(a.id)
            const gr = gruppi(a.serie)
            return (
            <div key={a.id} className={`log ${aperto ? 'aperto' : ''}`}>
              <button className="log-toggle" onClick={() => alterna(a.id)} aria-expanded={aperto}>
                <span className="log-riassunto">
                  {gr.map((x) => catalogo.get(x.esercizio_id)?.nome ?? 'esercizio rimosso').join(' · ')}
                </span>
                <span className="log-conta">{gr.length} es · {a.serie.length} serie</span>
                <span className="log-freccia" aria-hidden>▾</span>
              </button>
              {aperto && <div className="log-corpo">
              {gr.map((gr, i) => {
                const es = catalogo.get(gr.esercizio_id)
                return (
                  <div key={i} className="log-ex">
                    <div className="log-ex-name">
                      {es?.nome ?? 'esercizio rimosso'}
                      {es && <span className="log-cat">{NOME_CATEGORIA[es.categoria]}</span>}
                    </div>
                    <div className="log-sets">
                      {gr.serie.map((s) => <span key={s.id} className="log-set">{testoSerie(s)}</span>)}
                    </div>
                  </div>
                )
              })}
              {a.note && <div className="log-note">{a.note}</div>}
              <div className="log-actions">
                <button className="log-btn" onClick={() => onRipeti(a)}>↻ ripeti</button>
                <button className="log-btn danger" onClick={() => elimina(a)}>elimina</button>
              </div>
              </div>}
            </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
