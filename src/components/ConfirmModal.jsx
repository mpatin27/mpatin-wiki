import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Supprimer", isDanger = true }) {
  
  // Gestion Clavier (Echap pour fermer, Entrée pour valider)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      }
      
      if (e.key === 'Enter') {
        e.preventDefault(); // Empêche de valider un autre truc derrière
        onConfirm();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-enter" onClick={onClose}>
      <div 
        className="bg-wiki-surface border border-wiki-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()} 
      >
        <div className="p-6 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-wiki-border ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-wiki-accent/10 text-wiki-accent'}`}>
            <AlertTriangle size={24} />
          </div>
          
          <h3 className="text-lg font-bold text-wiki-text mb-2">{title}</h3>
          <p className="text-sm text-wiki-muted mb-6 leading-relaxed">
            {message}
          </p>

          <div className="flex gap-3 justify-center">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-wiki-bg border border-wiki-border text-wiki-text hover:bg-wiki-surface transition-colors text-sm font-medium"
            >
              Annuler (Esc)
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }}
              className={`px-4 py-2 rounded-lg text-white text-sm font-bold shadow-lg transition-all ${isDanger ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-wiki-accent hover:bg-blue-600 shadow-blue-500/20'}`}
            >
              {confirmText} (↵)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}