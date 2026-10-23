export type Vista = 'allenamento' | 'storico'

export function Navigazione({ vista, onVista }: { vista: Vista; onVista: (v: Vista) => void }) {
  return (
    <nav className="sezioni" aria-label="Sezioni">
      <button className={`nav-btn ${vista === 'allenamento' ? 'active' : ''}`} onClick={() => onVista('allenamento')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        <span>Allenamento</span>
      </button>
      <button className={`nav-btn ${vista === 'storico' ? 'active' : ''}`} onClick={() => onVista('storico')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        <span>Storico</span>
      </button>
    </nav>
  )
}
