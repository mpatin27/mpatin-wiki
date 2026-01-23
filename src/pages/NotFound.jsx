import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-enter">
      <div className="w-24 h-24 bg-wiki-surface rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-red-500/10 border border-wiki-border">
        <AlertTriangle size={48} className="text-red-500" />
      </div>
      
      <h1 className="text-4xl md:text-5xl font-bold text-wiki-text mb-4 font-mono">
        404_ERROR
      </h1>
      
      <div className="bg-[#0b101b] border border-wiki-border rounded-lg p-4 mb-8 font-mono text-sm text-left max-w-md w-full shadow-lg">
        <p className="text-red-400">$ connect --page "{window.location.pathname}"</p>
        <p className="text-wiki-muted mt-1">Error: Destination host unreachable.</p>
        <p className="text-wiki-muted">The requested resource could not be found on this server.</p>
        <p className="text-wiki-accent mt-2 animate-pulse">_</p>
      </div>

      <Link 
        to="/" 
        className="flex items-center gap-2 bg-wiki-accent hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-blue-500/20"
      >
        <Home size={18} />
        <span>Retour à la base</span>
      </Link>
    </div>
  );
}