import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Accesso con email e password, lo stesso account di ricettario e spese.
 * Nessuna registrazione: sull'hub è disattivata, gli account si creano dal
 * dashboard di Supabase.
 */
export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)

  const entra = async (e: FormEvent) => {
    e.preventDefault()
    setErrore(null)
    setInCorso(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setInCorso(false)
    // Messaggio identico per email sconosciuta e password errata: distinguerli
    // rivelerebbe quali indirizzi hanno un account.
    if (error) setErrore('Email o password non corretti.')
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={entra}>
        <div className="brand">
          <div className="brand-mark">/// calisthenics</div>
          <h1 className="brand-title">Diario <span className="accent">Allenamenti</span></h1>
        </div>
        <p className="login-sub">Accesso riservato.</p>

        <label className="field">
          <span className="field-label">email</span>
          <input className="input" type="email" value={email} autoComplete="username" required
            onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">password</span>
          <input className="input" type="password" value={password} autoComplete="current-password" required
            onChange={(e) => setPassword(e.target.value)} />
        </label>

        {errore && <p className="login-errore">{errore}</p>}

        <button className="btn-primary" type="submit" disabled={inCorso}>
          {inCorso ? 'accesso...' : 'Accedi'}
        </button>
      </form>
    </main>
  )
}
