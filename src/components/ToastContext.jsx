import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Fonction pour ajouter un toast
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-suppression après 4 secondes
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Fonction pour supprimer manuellement
  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      {/* CONTAINER DES NOTIFICATIONS (Fixé en bas à droite) */}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md min-w-[300px] animate-slide-in
              ${toast.type === 'success' ? 'bg-wiki-surface/90 border-emerald-500/50 text-emerald-400' : ''}
              ${toast.type === 'error' ? 'bg-wiki-surface/90 border-red-500/50 text-red-400' : ''}
              ${toast.type === 'info' ? 'bg-wiki-surface/90 border-blue-500/50 text-blue-400' : ''}
            `}
          >
            {toast.type === 'success' && <CheckCircle size={20} />}
            {toast.type === 'error' && <AlertCircle size={20} />}
            {toast.type === 'info' && <Info size={20} />}
            
            <p className="flex-1 text-sm font-medium text-wiki-text">{toast.message}</p>
            
            <button onClick={() => removeToast(toast.id)} className="hover:opacity-70 transition-opacity">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};