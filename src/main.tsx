import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    // C'est juste visuel, mais ça fait son effet !
    <div className="h-32 border-t border-green-900 bg-black p-2 text-xs font-mono overflow-y-auto opacity-80">
      <div className="text-gray-500">--- SYSTEM LOGS ---</div>
      <div>[14:00:01] Wiki OS initialized.</div>
      <div>[14:00:02] Connected to Supabase Node.</div>
      <div className="text-white">root@wiki:~$ <span className="animate-pulse">_</span></div>
    </div>
  </StrictMode>,
)
