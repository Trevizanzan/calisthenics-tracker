import { useEffect, useRef, useState } from 'react'
import { applicaAspetto, leggiAspetto, seguiSistema, SCALE, TEMI, type Aspetto, type Modo } from '../lib/aspetto'

const MODI: { id: Modo; nome: string }[] = [
  { id: 'scuro', nome: 'Notte' },
  { id: 'chiaro', nome: 'Giorno' },
  { id: 'auto', nome: 'Auto' },
]

/** Menu ⋯ in alto a destra: aspetto dell'app e uscita. */
export function Menu({ onEsci }: { onEsci: () => void }) {
  const [aperto, setAperto] = useState(false)
  const [aspetto, setAspetto] = useState<Aspetto>(leggiAspetto)
  const radice = useRef<HTMLDivElement>(null)

  useEffect(() => {
    applicaAspetto(aspetto)
    return seguiSistema(aspetto)
  }, [aspetto])

  // Le anteprime dei temi sono scritte ognuna nel suo font: a menu aperto
  // servono tutti. Si scaricano qui e non all'avvio.
  useEffect(() => {
    if (!aperto) return
    for (const t of TEMI) {
      if (t.fontUrl && !document.querySelector(`link[data-font="${t.id}"]`)) {
        const l = document.createElement('link')
        l.rel = 'stylesheet'
        l.href = t.fontUrl
        l.dataset.font = t.id
        document.head.appendChild(l)
      }
    }
    const fuori = (e: PointerEvent) => !radice.current?.contains(e.target as Node) && setAperto(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAperto(false)
    document.addEventListener('pointerdown', fuori)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', fuori)
      document.removeEventListener('keydown', esc)
    }
  }, [aperto])

  const cambia = (parziale: Partial<Aspetto>) => setAspetto((a) => ({ ...a, ...parziale }))
  const i = SCALE.indexOf(aspetto.scala)

  return (
    <div className="menu" ref={radice}>
      <button className="menu-btn" onClick={() => setAperto((x) => !x)} aria-label="Menu" aria-expanded={aperto}>⋯</button>
      {aperto && (
        <div className="menu-panel" role="menu">
          <div className="menu-sezione">
            <div className="menu-titolo">modalità</div>
            <div className="segmented">
              {MODI.map((m) => (
                <button key={m.id} className={aspetto.modo === m.id ? 'active' : ''} onClick={() => cambia({ modo: m.id })}>
                  {m.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="menu-sezione">
            <div className="menu-titolo">tema</div>
            <div className="temi">
              {TEMI.map((t) => (
                <button key={t.id} className={`tema ${aspetto.tema === t.id ? 'active' : ''}`} onClick={() => cambia({ tema: t.id })}>
                  <span className="tema-colore" style={{ background: t.colore }} />
                  <span className="tema-nome" style={{ fontFamily: `'${t.font}'` }}>{t.nome}</span>
                  <span className="tema-font" style={{ fontFamily: `'${t.mono}'` }}>{t.font}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="menu-sezione">
            <div className="menu-titolo">dimensione testo</div>
            <div className="scala">
              <button onClick={() => cambia({ scala: SCALE[i - 1] })} disabled={i <= 0} aria-label="Testo più piccolo">A−</button>
              <span>{Math.round(aspetto.scala * 100)}%</span>
              <button onClick={() => cambia({ scala: SCALE[i + 1] })} disabled={i >= SCALE.length - 1} aria-label="Testo più grande">A+</button>
            </div>
          </div>

          <button className="menu-esci" onClick={onEsci}>esci</button>
        </div>
      )}
    </div>
  )
}
