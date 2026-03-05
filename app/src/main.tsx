import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// No StrictMode — avoids double-fetches in dev for polling loops
createRoot(document.getElementById('root')!).render(<App />)
