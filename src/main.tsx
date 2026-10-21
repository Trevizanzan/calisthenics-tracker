import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applicaAspetto, leggiAspetto } from './lib/aspetto'
import './temi.css'
import './styles.css'

applicaAspetto(leggiAspetto())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
