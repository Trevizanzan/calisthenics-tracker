import { createClient } from '@supabase/supabase-js'

/**
 * Client per lo schema `calisthenics` dell'hub, lo stesso progetto del
 * ricettario e di spese. La chiave è quella pubblicabile e finisce nel bundle
 * per costruzione: a proteggere i dati sono le RLS, che al ruolo `anon` non
 * concedono nemmeno l'accesso allo schema.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { db: { schema: 'calisthenics' } }
)
