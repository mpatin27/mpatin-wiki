import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Check, Edit2, Folder, Loader2 } from 'lucide-react';

export default function FolderManager({ isOpen, onClose, onRename }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [newValue, setNewValue] = useState('');

  // GESTION FERMETURE VIA ECHAP (ESC)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // CHARGEMENT DES DOSSIERS
  const fetchFolders = async () => {
    setLoading(true);
    const { data } = await supabase.from('wiki_posts').select('folder');
    if (data) {
      const counts = {};
      data.forEach(p => {
        const f = p.folder || 'General';
        counts[f] = (counts[f] || 0) + 1;
      });
      const list = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setFolders(list);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchFolders();
  }, [isOpen]);

  // MODE ÉDITION
  const startEdit = (folderName) => {
    setEditingFolder(folderName);
    setNewValue(folderName);
  };

  // RENOMMER (Action SQL + Sync Parent)
  const handleRename = async () => {
    if (!newValue.trim() || newValue === editingFolder) {
      setEditingFolder(null);
      return;
    }
    setLoading(true);
    
    // Appel de la fonction SQL RPC
    const { error } = await supabase.rpc('rename_folder', { 
      old_name: editingFolder, 
      new_name: newValue.trim() 
    });

    if (error) {
      alert(error.message);
    } else {
      // IMPORTANT : On prévient le composant parent (Admin.jsx)
      if (onRename) onRename(editingFolder, newValue.trim());

      setEditingFolder(null);
      await fetchFolders(); // Rafraîchir la liste
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    // BACKDROP (Fond noir) : Ferme le modal au clic
    <div 
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-enter"
      onClick={onClose}
    >
      {/* MODAL : stopPropagation empêche de fermer quand on clique DANS la fenêtre */}
      <div 
        className="bg-wiki-surface border border-wiki-border rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 border-b border-wiki-border">
          <h3 className="font-bold text-wiki-text flex items-center gap-2">
            <Folder size={18} className="text-wiki-accent"/> Gestion des Dossiers
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-wiki-bg rounded-md transition-colors">
            <X size={18} className="text-wiki-muted hover:text-wiki-text"/>
          </button>
        </div>

        {/* LISTE */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
          {loading && folders.length === 0 ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-wiki-accent"/></div>
          ) : folders.length === 0 ? (
            <div className="text-center p-8 text-wiki-muted text-sm">Aucun dossier trouvé.</div>
          ) : (
            folders.map(folder => (
              <div key={folder.name} className="group flex items-center justify-between p-2 rounded-lg hover:bg-wiki-bg transition-colors border border-transparent hover:border-wiki-border/50">
                
                {editingFolder === folder.name ? (
                  /* MODE ÉDITION */
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input 
                      autoFocus
                      className="bg-wiki-surface border border-wiki-accent rounded px-2 py-1 text-sm text-wiki-text w-full outline-none"
                      value={newValue}
                      onChange={e => setNewValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRename()}
                    />
                    <button onClick={handleRename} className="text-emerald-400 p-1 hover:bg-emerald-400/10 rounded"><Check size={14}/></button>
                    <button onClick={() => setEditingFolder(null)} className="text-red-400 p-1 hover:bg-red-400/10 rounded"><X size={14}/></button>
                  </div>
                ) : (
                  /* MODE AFFICHAGE */
                  <>
                    <div className="flex items-center gap-2 overflow-hidden">
                       <Folder size={14} className="text-wiki-muted shrink-0" />
                       <span className="text-sm text-wiki-text truncate">{folder.name}</span>
                       <span className="text-[10px] bg-wiki-bg border border-wiki-border px-1.5 rounded-full text-wiki-muted">{folder.count}</span>
                    </div>
                    <button 
                      onClick={() => startEdit(folder.name)} 
                      className="p-1.5 text-wiki-muted hover:text-blue-400 hover:bg-blue-400/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Renommer ce dossier"
                    >
                      <Edit2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}