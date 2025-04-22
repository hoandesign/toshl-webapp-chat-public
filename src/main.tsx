import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Removed slick-carousel CSS imports
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
