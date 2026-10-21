export type Categoria = 'spinta' | 'tirata' | 'gambe' | 'core' | 'skill' | 'mobilita'
export type Misura = 'rip' | 'sec'

export type Esercizio = {
  id: string
  /** null per gli esercizi del template, l'utente per quelli creati da lui. */
  user_id: string | null
  nome: string
  categoria: Categoria
  descrizione: string | null
  misura: Misura
  zavorra: boolean
}

export type Serie = {
  id: string
  esercizio_id: string
  ordine: number
  ripetizioni: number | null
  secondi: number | null
  kg: number | null
}

export type Allenamento = {
  id: string
  data: string
  note: string | null
  created_at: string
  serie: Serie[]
}

/** Una serie mentre la si scrive: stringhe, come escono dagli input. */
export type SerieBozza = { valore: string; kg: string }

export type BloccoBozza = {
  chiave: string
  esercizio_id: string
  serie: SerieBozza[]
}

export type Bozza = {
  data: string
  note: string
  blocchi: BloccoBozza[]
}
