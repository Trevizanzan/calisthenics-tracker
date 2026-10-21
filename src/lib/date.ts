/**
 * Data di oggi nel fuso del telefono. `toISOString` darebbe quella UTC: fra
 * mezzanotte e le due un allenamento finirebbe sul giorno prima.
 */
export function oggi(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const FORMATO = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export function dataLeggibile(iso: string): string {
  const [a, m, g] = iso.split('-').map(Number)
  return FORMATO.format(new Date(a, m - 1, g))
}
