import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { caricaAllenamenti, caricaEsercizi, caricaOrdine, caricaPullup, salvaOrdine } from './lib/dati'
import { bozzaDa, leggiBozza, scriviBozza } from './lib/bozza'
import type { Allenamento, Bozza, Esercizio } from './types'
import { Login } from './components/Login'
import { NuovoAllenamento } from './components/NuovoAllenamento'
import { Storico } from './components/Storico'
import { Navigazione, type Vista } from './components/Navigazione'
import { Menu } from './components/Menu'

function useSessione() {
  const [sessione, setSessione] = useState<Session | null>(null)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessione(data.session)
      setPronto(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessione(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return { sessione, pronto }
}

/**
 * Il cancello: finché non c'è una sessione si vede solo il login. Il resto
 * dell'app non viene nemmeno montato, quindi nessun dato e nessuna richiesta
 * partono senza utente.
 */
export default function App() {
  const { sessione, pronto } = useSessione()
  if (!pronto) return null
  if (!sessione) return <Login />
  return <AppAutenticata userId={sessione.user.id} />
}

function AppAutenticata({ userId }: { userId: string }) {
  const [vista, setVista] = useState<Vista>('allenamento')
  const [esercizi, setEsercizi] = useState<Esercizio[]>([])
  const [storico, setStorico] = useState<Allenamento[]>([])
  const [pullup, setPullup] = useState<Record<string, number>>({})
  const [ordine, setOrdine] = useState<Record<string, number>>({})
  const [stato, setStato] = useState<'caricamento' | 'ok' | 'errore'>('caricamento')
  const [bozza, setBozza] = useState<Bozza>(leggiBozza)
  const [avviso, setAvviso] = useState<{ testo: string; errore: boolean } | null>(null)
  const timerAvviso = useRef<number>()

  const avvisa = useCallback((testo: string, errore = false) => {
    setAvviso({ testo, errore })
    clearTimeout(timerAvviso.current)
    timerAvviso.current = window.setTimeout(() => setAvviso(null), 2400)
  }, [])

  const ricaricaStorico = useCallback(async () => {
    setStorico(await caricaAllenamenti())
  }, [])

  useEffect(() => {
    Promise.all([caricaEsercizi(), caricaAllenamenti(), caricaPullup(), caricaOrdine()])
      .then(([e, a, p, o]) => {
        setOrdine(o)
        setEsercizi(e)
        setStorico(a)
        setPullup(p)
        setStato('ok')
      })
      .catch((err) => {
        console.error(err)
        setStato('errore')
        avvisa('Errore di connessione', true)
      })
  }, [avvisa])

  useEffect(() => scriviBozza(bozza), [bozza])

  const catalogo = useMemo(() => new Map(esercizi.map((e) => [e.id, e])), [esercizi])

  // Si aggiorna subito a schermo; se il salvataggio fallisce si torna indietro.
  const riordina = async (ids: string[]) => {
    const prima = ordine
    setOrdine((o) => ({ ...o, ...Object.fromEntries(ids.map((id, i) => [id, i])) }))
    try {
      await salvaOrdine(ids)
    } catch {
      setOrdine(prima)
      avvisa('Ordine non salvato', true)
    }
  }

  const ripeti = (a: Allenamento) => {
    if (bozza.blocchi.length && !confirm('Sostituire l\'allenamento in corso?')) return
    setBozza(bozzaDa(a))
    setVista('allenamento')
    window.scrollTo(0, 0)
  }

  return (
    <>
      <div className="app">
        <header className="header">
          <div className="brand">
            <div className="brand-mark">/// calisthenics</div>
            <h1 className="brand-title">Diario <span className="accent">Allenamenti</span></h1>
          </div>
          <Navigazione vista={vista} onVista={setVista} />
          <div className="header-destra">
            <div className="sync-row" title={stato === 'ok' ? 'sincronizzato' : stato === 'errore' ? 'errore connessione' : 'caricamento...'}>
              <span className={`sync-dot ${stato === 'ok' ? 'ok' : stato === 'errore' ? 'err' : 'loading'}`} />
              <span className="sync-testo">{stato === 'ok' ? 'sincronizzato' : stato === 'errore' ? 'errore connessione' : 'caricamento...'}</span>
            </div>
            <Menu onEsci={() => supabase.auth.signOut()} />
          </div>
        </header>

        {vista === 'allenamento' ? (
          <NuovoAllenamento
            userId={userId}
            esercizi={esercizi}
            ordine={ordine}
            onRiordina={riordina}
            catalogo={catalogo}
            storico={storico}
            pullup={pullup}
            bozza={bozza}
            onBozza={setBozza}
            onPullup={(data, n) => setPullup((p) => ({ ...p, [data]: n }))}
            onNuovoEsercizio={(e) => setEsercizi((lista) => [...lista, e].sort((a, b) => a.nome.localeCompare(b.nome)))}
            onSalvato={ricaricaStorico}
            avvisa={avvisa}
          />
        ) : (
          <Storico
            storico={storico}
            catalogo={catalogo}
            pullup={pullup}
            onRipeti={ripeti}
            onEliminato={(id) => setStorico((s) => s.filter((a) => a.id !== id))}
            avvisa={avvisa}
          />
        )}
      </div>

      <div className={`toast ${avviso ? 'show' : ''} ${avviso?.errore ? 'err' : ''}`}>{avviso?.testo}</div>
    </>
  )
}
