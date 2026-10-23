import { useState } from 'react'
import type { Allenamento, Esercizio } from '../types'
import { gruppi, testoSerie } from '../lib/bozza'
import { eliminaAllenamento } from '../lib/dati'
import { dataBreve, dataLeggibile } from '../lib/date'
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

  // Muscle up del giorno, contati dalle serie degli allenamenti: a differenza
  // dei pull-up non c'è un contatore a parte, quindi si leggono da lì.
  const muscleUp: Record<string, number> = {}
  for (const a of storico) {
    for (const s of a.serie) {
      if (catalogo.get(s.esercizio_id)?.nome === 'Muscle up' && s.ripetizioni) {
        muscleUp[a.data] = (muscleUp[a.data] ?? 0) + s.ripetizioni
      }
    }
  }

  // Di partenza sono tutti chiusi: una riga per allenamento, si apre quello che interessa.
  const [aperti, setAperti] = useState<Set<string>>(() => new Set())
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
      {giorni.map((g) => {
        // Pull-up e muscle up sono del giorno: compaiono sulla riga del primo
        // allenamento, o da soli se quel giorno non c'è un allenamento.
        const badge = (
          <span className="log-badge-giorno">
            {pullup[g] > 0 && (
              <span className="pullup-day-badge">{pullup[g]}<span className="badge-lungo"> pull-up</span><span className="badge-corto"> PU</span></span>
            )}
            {muscleUp[g] > 0 && (
              <span className="pullup-day-badge mu">{muscleUp[g]}<span className="badge-lungo"> muscle up</span><span className="badge-corto"> MU</span></span>
            )}
          </span>
        )
        const delGiorno = storico.filter((a) => a.data === g)
        if (!delGiorno.length) {
          return (
            <div key={g} className="log riga solo-conteggi">
              <span className="log-data">{dataBreve(g)}</span>
              <span className="log-riassunto vuoto">solo pull-up</span>
              {badge}
              <span className="log-freccia" aria-hidden />
            </div>
          )
        }
        return delGiorno.map((a, n) => {
          const aperto = aperti.has(a.id)
          const gr = gruppi(a.serie)
          return (
            <div key={a.id} className={`log riga ${aperto ? 'aperto' : ''}`}>
              <button className="log-toggle" onClick={() => alterna(a.id)} aria-expanded={aperto}
                title={gr.map((x) => catalogo.get(x.esercizio_id)?.nome ?? 'esercizio rimosso').join(' · ')}>
                <span className="log-data">{dataBreve(a.data)}</span>
                <span className="log-riassunto">
                  {gr.map((x) => catalogo.get(x.esercizio_id)?.nome ?? 'esercizio rimosso').join(' · ')}
                </span>
                {n === 0 ? badge : <span className="log-badge-giorno" />}
                <span className="log-freccia" aria-hidden>▾</span>
              </button>
              {aperto && (
                <div className="log-corpo">
                  <div className="log-conta">{gr.length} esercizi · {a.serie.length} serie</div>
                  {gr.map((x, i) => {
                    const es = catalogo.get(x.esercizio_id)
                    return (
                      <div key={i} className="log-ex">
                        <div className="log-ex-name">
                          {es?.nome ?? 'esercizio rimosso'}
                          {es && <span className="log-cat">{NOME_CATEGORIA[es.categoria]}</span>}
                        </div>
                        <div className="log-sets">
                          {x.serie.map((s) => <span key={s.id} className="log-set">{testoSerie(s)}</span>)}
                        </div>
                      </div>
                    )
                  })}
                  {a.note && <div className="log-note">{a.note}</div>}
                  <div className="log-actions">
                    <button className="log-btn" onClick={() => onRipeti(a)}>↻ ripeti</button>
                    <button className="log-btn danger" onClick={() => elimina(a)}>elimina</button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      })}
    </div>
  )
}
