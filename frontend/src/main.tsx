import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
// TODO(Task 14): uncomment once frontend/src/styles/theme.css exists
// import './styles/theme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
