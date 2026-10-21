import type { Allenamento, BloccoBozza, Bozza, Serie } from '../types'
import { oggi } from './date'

const CHIAVE = 'muscleup:bozza'

export function bozzaVuota(): Bozza {
  return { data: oggi(), note: '', blocchi: [] }
}

/**
 * La bozza vive nel browser: chiudere l'app a metà allenamento non deve far
 * perdere le serie già scritte. Non è dato da proteggere, il salvataggio vero
 * avviene su Supabase.
 */
export function leggiBozza(): Bozza {
  try {
    const s = localStorage.getItem(CHIAVE)
    if (s) return JSON.parse(s)
  } catch { /* storage non disponibile: si riparte vuoti */ }
  return bozzaVuota()
}

export function scriviBozza(b: Bozza) {
  try {
    if (b.blocchi.length || b.note) localStorage.setItem(CHIAVE, JSON.stringify(b))
    else localStorage.removeItem(CHIAVE)
  } catch { /* idem */ }
}

let contatore = 0
export const nuovaChiave = () => `b${Date.now()}-${contatore++}`

export function nuovoBlocco(esercizio_id: string): BloccoBozza {
  return { chiave: nuovaChiave(), esercizio_id, serie: [{ valore: '', kg: '' }] }
}

/** Serie consecutive dello stesso esercizio, come le si è fatte. */
export function gruppi(serie: Serie[]): { esercizio_id: string; serie: Serie[] }[] {
  const out: { esercizio_id: string; serie: Serie[] }[] = []
  for (const s of serie) {
    const ultimo = out[out.length - 1]
    if (ultimo?.esercizio_id === s.esercizio_id) ultimo.serie.push(s)
    else out.push({ esercizio_id: s.esercizio_id, serie: [s] })
  }
  return out
}

/** Un allenamento passato ricopiato come bozza di oggi, valori compresi. */
export function bozzaDa(a: Allenamento): Bozza {
  return {
    data: oggi(),
    note: '',
    blocchi: gruppi(a.serie).map((g) => ({
      chiave: nuovaChiave(),
      esercizio_id: g.esercizio_id,
      serie: g.serie.map((s) => ({
        valore: String(s.ripetizioni ?? s.secondi ?? ''),
        kg: s.kg != null ? String(s.kg) : '',
      })),
    })),
  }
}

export function testoSerie(s: Serie): string {
  const v = s.ripetizioni != null ? `${s.ripetizioni}` : s.secondi != null ? `${s.secondi}s` : '—'
  return s.kg ? `${v} @${s.kg}kg` : v
}

/** L'ultima volta che l'esercizio compare nello storico, per il suggerimento. */
export function ultimaVolta(storico: Allenamento[], esercizio_id: string) {
  for (const a of storico) {
    const serie = a.serie.filter((s) => s.esercizio_id === esercizio_id)
    if (serie.length) return { data: a.data, serie }
  }
  return null
}
