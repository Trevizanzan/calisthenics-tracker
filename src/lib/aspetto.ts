/**
 * Tema, modalità chiaro/scuro e dimensione del testo. Sono preferenze di
 * questo dispositivo: stanno in localStorage, non sull'hub.
 *
 * Lo script in testa a index.html applica le stesse chiavi prima che la
 * pagina venga disegnata, così non si vede il tema predefinito lampeggiare.
 * Se si cambiano le chiavi o i valori qui, va aggiornato anche lui.
 */

export type Modo = 'scuro' | 'chiaro' | 'auto'
export type IdTema = 'neon' | 'oceano' | 'brace' | 'lavanda'

export type Aspetto = { tema: IdTema; modo: Modo; scala: number }

export const TEMI: { id: IdTema; nome: string; font: string; mono: string; fontUrl: string | null; colore: string }[] = [
  { id: 'neon', nome: 'Neon', font: 'Bricolage Grotesque', mono: 'JetBrains Mono', fontUrl: null, colore: '#d4ff3a' },
  {
    id: 'oceano', nome: 'Oceano', font: 'Space Grotesk', mono: 'IBM Plex Mono', colore: '#3de0c8',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
  },
  {
    id: 'brace', nome: 'Brace', font: 'Archivo', mono: 'Space Mono', colore: '#ff7a2f',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap',
  },
  {
    id: 'lavanda', nome: 'Lavanda', font: 'Fraunces', mono: 'DM Mono', colore: '#b79cff',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,700&family=DM+Mono:wght@400;500&display=swap',
  },
]

export const SCALE = [0.85, 0.92, 1, 1.08, 1.16, 1.25, 1.35]

const CHIAVE = 'muscleup:aspetto'
const PREDEFINITO: Aspetto = { tema: 'neon', modo: 'scuro', scala: 1 }

export function leggiAspetto(): Aspetto {
  try {
    const s = JSON.parse(localStorage.getItem(CHIAVE) ?? 'null')
    if (s && TEMI.some((t) => t.id === s.tema) && ['scuro', 'chiaro', 'auto'].includes(s.modo) && SCALE.includes(s.scala)) return s
  } catch { /* storage assente o valore rovinato: si torna al predefinito */ }
  return PREDEFINITO
}

const sistemaScuro = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export function applicaAspetto(a: Aspetto) {
  try { localStorage.setItem(CHIAVE, JSON.stringify(a)) } catch { /* resta solo per questa visita */ }

  const html = document.documentElement
  const modo = a.modo === 'auto' ? (sistemaScuro() ? 'scuro' : 'chiaro') : a.modo
  html.dataset.tema = a.tema
  html.dataset.modo = modo
  html.style.setProperty('--scala', String(a.scala))

  // I font di Neon sono già in index.html; gli altri si scaricano solo quando servono.
  const tema = TEMI.find((t) => t.id === a.tema)!
  if (tema.fontUrl && !document.querySelector(`link[data-font="${tema.id}"]`)) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = tema.fontUrl
    link.dataset.font = tema.id
    document.head.appendChild(link)
  }

  // Il colore della barra del browser sul telefono segue lo sfondo.
  const bg = getComputedStyle(html).getPropertyValue('--bg').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
}

/** In modalità "auto" segue il sistema anche mentre l'app è aperta. */
export function seguiSistema(a: Aspetto) {
  if (a.modo !== 'auto') return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const cambia = () => applicaAspetto(a)
  mq.addEventListener('change', cambia)
  return () => mq.removeEventListener('change', cambia)
}
