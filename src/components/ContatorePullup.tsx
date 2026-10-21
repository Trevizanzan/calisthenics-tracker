import { useEffect, useRef } from 'react'
import { salvaPullup } from '../lib/dati'
import { oggi } from '../lib/date'

type Props = {
  data: string
  conteggio: number
  onCambia: (data: string, n: number) => void
  avvisa: (testo: string, errore?: boolean) => void
}

/**
 * Pull-up sparsi nella giornata, fuori dall'allenamento. Il numero cambia
 * subito a schermo; il salvataggio aspetta che si smetta di premere, così
 * dieci tocchi di fila diventano una scrittura sola.
 */
export function ContatorePullup({ data, conteggio, onCambia, avvisa }: Props) {
  const timer = useRef<number>()
  const inSospeso = useRef<{ data: string; n: number } | null>(null)

  const scrivi = () => {
    const s = inSospeso.current
    inSospeso.current = null
    if (s) salvaPullup(s.data, s.n).catch(() => avvisa('Pull-up non salvati', true))
  }

  // Se si cambia data o si lascia la vista a metà, il conteggio parte subito.
  useEffect(() => () => { clearTimeout(timer.current); scrivi() }, [data])

  const aggiungi = (delta: number) => {
    const n = Math.max(0, conteggio + delta)
    onCambia(data, n)
    inSospeso.current = { data, n }
    clearTimeout(timer.current)
    timer.current = window.setTimeout(scrivi, 1000)
  }

  return (
    <div className="pullup-widget">
      <div className="pullup-total">
        <div className="pullup-number">{conteggio}</div>
        <div className="pullup-label">{data === oggi() ? 'pull-up oggi' : `pull-up il ${data.split('-').reverse().join('/')}`}</div>
      </div>
      <div className="pullup-controls">
        <button className="pullup-btn minus" onClick={() => aggiungi(-1)} aria-label="Togli un pull-up">−</button>
        <button className="pullup-btn plus" onClick={() => aggiungi(1)} aria-label="Aggiungi un pull-up">+</button>
        <button className="pullup-btn plus five" onClick={() => aggiungi(5)} aria-label="Aggiungi cinque pull-up">+5</button>
      </div>
    </div>
  )
}
