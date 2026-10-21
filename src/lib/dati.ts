import { supabase } from './supabase'
import type { Allenamento, Bozza, Categoria, Esercizio, Misura } from '../types'

export async function caricaEsercizi(): Promise<Esercizio[]> {
  const { data, error } = await supabase
    .from('esercizi')
    .select('id, user_id, nome, categoria, descrizione, misura, zavorra')
    .order('nome')
  if (error) throw error
  return data
}

export async function caricaAllenamenti(): Promise<Allenamento[]> {
  const { data, error } = await supabase
    .from('allenamenti')
    .select('id, data, note, created_at, serie(id, esercizio_id, ordine, ripetizioni, secondi, kg)')
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  for (const a of data) a.serie.sort((x, y) => x.ordine - y.ordine)
  return data
}

/** Conteggi dei pull-up giornalieri, indicizzati per data. */
export async function caricaPullup(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('pullup_giornalieri').select('data, conteggio')
  if (error) throw error
  return Object.fromEntries(data.map((r) => [r.data, r.conteggio]))
}

export async function salvaPullup(data: string, conteggio: number) {
  const { error } = await supabase
    .from('pullup_giornalieri')
    .upsert({ data, conteggio, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function creaEsercizio(
  userId: string,
  campi: { nome: string; categoria: Categoria; misura: Misura; zavorra: boolean; descrizione: string | null }
): Promise<Esercizio> {
  const { data, error } = await supabase
    .from('esercizi')
    .insert({ ...campi, user_id: userId })
    .select('id, user_id, nome, categoria, descrizione, misura, zavorra')
    .single()
  if (error) throw error
  return data
}

function numero(s: string): number | null {
  const n = Number(s.replace(',', '.'))
  return s.trim() && Number.isFinite(n) ? n : null
}

/**
 * Salva la bozza come allenamento. Le serie vuote vengono scartate, e gli
 * esercizi rimasti senza serie con lui. Se l'inserimento delle serie fallisce
 * l'allenamento appena creato viene eliminato: meglio niente che mezzo.
 */
export async function salvaAllenamento(bozza: Bozza, catalogo: Map<string, Esercizio>) {
  const righe = bozza.blocchi.flatMap((b) => {
    const es = catalogo.get(b.esercizio_id)
    if (!es) return []
    return b.serie
      .map((s) => ({ valore: numero(s.valore), kg: es.zavorra ? numero(s.kg) : null }))
      .filter((s) => s.valore !== null)
      .map((s) => ({
        esercizio_id: es.id,
        ripetizioni: es.misura === 'rip' ? Math.round(s.valore!) : null,
        secondi: es.misura === 'sec' ? Math.round(s.valore!) : null,
        kg: s.kg,
      }))
  })
  if (!righe.length) throw new Error('Inserisci almeno una serie')

  const { data: allenamento, error } = await supabase
    .from('allenamenti')
    .insert({ data: bozza.data, note: bozza.note.trim() || null })
    .select('id')
    .single()
  if (error) throw error

  const { error: erroreSerie } = await supabase
    .from('serie')
    .insert(righe.map((r, i) => ({ ...r, allenamento_id: allenamento.id, ordine: i })))
  if (erroreSerie) {
    await supabase.from('allenamenti').delete().eq('id', allenamento.id)
    throw erroreSerie
  }
}

export async function eliminaAllenamento(id: string) {
  const { error } = await supabase.from('allenamenti').delete().eq('id', id)
  if (error) throw error
}

/** Posizione scelta a mano per ogni esercizio, per l'utente loggato. */
export async function caricaOrdine(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('ordine_esercizi').select('esercizio_id, posizione')
  if (error) throw error
  return Object.fromEntries(data.map((r) => [r.esercizio_id, r.posizione]))
}

/** Riscrive le posizioni di una categoria intera, nell'ordine dato. */
export async function salvaOrdine(ids: string[]) {
  const { error } = await supabase
    .from('ordine_esercizi')
    .upsert(ids.map((esercizio_id, posizione) => ({ esercizio_id, posizione })))
  if (error) throw error
}

/**
 * Prima gli esercizi con una posizione, nel loro ordine; poi gli altri in
 * ordine alfabetico, così un esercizio appena creato finisce in fondo.
 */
export function ordina<T extends { id: string; nome: string }>(lista: T[], ordine: Record<string, number>): T[] {
  return [...lista].sort((a, b) => {
    const pa = ordine[a.id], pb = ordine[b.id]
    if (pa != null && pb != null) return pa - pb
    if (pa != null) return -1
    if (pb != null) return 1
    return a.nome.localeCompare(b.nome)
  })
}
