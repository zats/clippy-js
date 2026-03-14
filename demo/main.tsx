import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'xp.css/dist/XP.css'
import { App } from './App'
import './styles.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Missing #root element.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
