import { useState } from 'react'
import type { Allenamento, Bozza, Esercizio } from '../types'
import { bozzaVuota, nuovoBlocco, testoSerie, ultimaVolta } from '../lib/bozza'
import { salvaAllenamento } from '../lib/dati'
import { dataBreve, dataLeggibile } from '../lib/date'
import { NOME_CATEGORIA } from '../lib/categorie'
import { ContatorePullup } from './ContatorePullup'
import { SceltaEsercizio } from './SceltaEsercizio'

type Props = {
  userId: string
  esercizi: Esercizio[]
  ordine: Record<string, number>
  onRiordina: (ids: string[]) => void
  catalogo: Map<string, Esercizio>
  storico: Allenamento[]
  pullup: Record<string, number>
  bozza: Bozza
  onBozza: (b: Bozza) => void
  onPullup: (data: string, n: number) => void
  onNuovoEsercizio: (e: Esercizio) => void
  onSalvato: () => Promise<void>
  avvisa: (testo: string, errore?: boolean) => void
}

export function NuovoAllenamento(p: Props) {
  const { bozza, onBozza, catalogo } = p
  const [salvataggio, setSalvataggio] = useState(false)

  const modificaBlocco = (chiave: string, f: (b: Bozza['blocchi'][number]) => Bozza['blocchi'][number] | null) =>
    onBozza({
      ...bozza,
      blocchi: bozza.blocchi.flatMap((b) => {
        if (b.chiave !== chiave) return [b]
        const nuovo = f(b)
        return nuovo ? [nuovo] : []
      }),
    })

  const sposta = (i: number, verso: -1 | 1) => {
    const j = i + verso
    if (j < 0 || j >= bozza.blocchi.length) return
    const blocchi = [...bozza.blocchi]
    ;[blocchi[i], blocchi[j]] = [blocchi[j], blocchi[i]]
    onBozza({ ...bozza, blocchi })
  }

  const salva = async () => {
    setSalvataggio(true)
    try {
      await salvaAllenamento(bozza, catalogo)
      await p.onSalvato()
      onBozza({ ...bozzaVuota(), data: bozza.data })
      p.avvisa('Allenamento salvato')
    } catch (e) {
      p.avvisa(e instanceof Error ? e.message : 'Errore nel salvataggio', true)
    } finally {
      setSalvataggio(false)
    }
  }

  // Il catalogo funziona come un carrello: un tocco aggiunge, un altro toglie.
  // Se l'esercizio ha già delle serie scritte si chiede prima di buttarle.
  const alterna = (id: string) => {
    const blocco = bozza.blocchi.find((b) => b.esercizio_id === id)
    if (!blocco) return onBozza({ ...bozza, blocchi: [...bozza.blocchi, nuovoBlocco(id)] })
    const scritto = blocco.serie.some((s) => s.valore.trim() || s.kg.trim())
    if (scritto && !confirm(`Togliere ${catalogo.get(id)?.nome ?? "l'esercizio"} e le serie scritte?`)) return
    onBozza({ ...bozza, blocchi: bozza.blocchi.filter((b) => b.esercizio_id !== id) })
  }

  const svuota = () => {
    if (bozza.blocchi.length && !confirm('Cancellare l\'allenamento in corso?')) return
    onBozza({ ...bozzaVuota(), data: bozza.data })
  }

  return (
    <div>
      <ContatorePullup data={bozza.data} conteggio={p.pullup[bozza.data] ?? 0} onCambia={p.onPullup} avvisa={p.avvisa} />

      <div className="date-bar">
        <label htmlFor="data">data</label>
        <input id="data" type="date" value={bozza.data} onChange={(e) => e.target.value && onBozza({ ...bozza, data: e.target.value })} />
      </div>

      <SceltaEsercizio
        userId={p.userId}
        esercizi={p.esercizi}
        ordine={p.ordine}
        onRiordina={p.onRiordina}
        scelti={new Set(bozza.blocchi.map((b) => b.esercizio_id))}
        onAlterna={alterna}
        onAggiungi={(id) => onBozza({ ...bozza, blocchi: [...bozza.blocchi, nuovoBlocco(id)] })}
        onNuovo={p.onNuovoEsercizio}
        avvisa={p.avvisa}
      />

      <div className="history-title carrello-titolo">
        // allenamento in corso{bozza.blocchi.length > 0 && ` · ${bozza.blocchi.length} esercizi`}
      </div>
      {bozza.blocchi.length === 0 && (
        <div className="carrello-vuoto">Tocca gli esercizi qui sopra per aggiungerli: finiscono qui, dove scrivi le serie.</div>
      )}

      <div className="exercises">
        {bozza.blocchi.map((b, i) => {
          const es = catalogo.get(b.esercizio_id)
          if (!es) return null
          const prima = ultimaVolta(p.storico, es.id)
          const unita = es.misura === 'rip' ? 'rip' : 'sec'
          return (
            <div key={b.chiave} className={`ex-card compatta ${es.categoria === 'mobilita' ? 'mobility' : ''}`}>
              <div className="ex-header">
                <div className="ex-top">
                  <span className="ex-name">{es.nome}</span>
                  <span className="ex-tag">{NOME_CATEGORIA[es.categoria]}</span>
                  <span className="ex-tools">
                    <button className="icon-btn" onClick={() => sposta(i, -1)} disabled={i === 0} aria-label="Sposta su">↑</button>
                    <button className="icon-btn" onClick={() => sposta(i, 1)} disabled={i === bozza.blocchi.length - 1} aria-label="Sposta giù">↓</button>
                    <button className="icon-btn danger" onClick={() => modificaBlocco(b.chiave, () => null)} aria-label="Togli esercizio">✕</button>
                  </span>
                </div>
                {(es.descrizione || prima) && (
                  <div className="ex-info">
                    {es.descrizione && <span className="ex-desc">{es.descrizione}</span>}
                    {prima && (
                      <span className="ex-target" title={`ultima volta, ${dataLeggibile(prima.data)}`}>
                        ↺ {dataBreve(prima.data)}: {prima.serie.map(testoSerie).join(' · ')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="sets-list">
                {b.serie.map((s, k) => (
                  <div key={k} className="set-row">
                    <span className="set-label">S{k + 1}</span>
                    <input className="set-input" inputMode="numeric" placeholder={unita} value={s.valore}
                      onChange={(e) => modificaBlocco(b.chiave, (bl) => ({
                        ...bl, serie: bl.serie.map((x, z) => (z === k ? { ...x, valore: e.target.value } : x)),
                      }))} />
                    {es.zavorra && (
                      <input className="set-input" inputMode="decimal" placeholder="+kg" value={s.kg}
                        onChange={(e) => modificaBlocco(b.chiave, (bl) => ({
                          ...bl, serie: bl.serie.map((x, z) => (z === k ? { ...x, kg: e.target.value } : x)),
                        }))} />
                    )}
                    {b.serie.length > 1 && (
                      <button className="del-btn" aria-label="Togli serie"
                        onClick={() => modificaBlocco(b.chiave, (bl) => ({ ...bl, serie: bl.serie.filter((_, z) => z !== k) }))}>×</button>
                    )}
                  </div>
                ))}
                <button className="add-set"
                  onClick={() => modificaBlocco(b.chiave, (bl) => ({ ...bl, serie: [...bl.serie, { ...bl.serie[bl.serie.length - 1] }] }))}>
                  + serie
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {bozza.blocchi.length > 0 && (
        <>
          <textarea className="set-textarea note-allenamento" placeholder="note (elastico usato, sensazioni...)" value={bozza.note}
            onChange={(e) => onBozza({ ...bozza, note: e.target.value })} />
          <div className="actions">
            <button className="btn-primary" onClick={salva} disabled={salvataggio}>
              {salvataggio ? 'salvataggio...' : 'Salva allenamento'}
            </button>
            <button className="btn-secondary" onClick={svuota}>Cancella</button>
          </div>
        </>
      )}

    </div>
  )
}
