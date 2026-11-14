import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Actualizacion from './componentes/Actualizacion'
import Recuperacion from './componentes/Recuperacion'
import './index.css'
import './demo.css'
import './perfiles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Recuperacion><App /><Actualizacion /></Recuperacion>
  </StrictMode>,
)
