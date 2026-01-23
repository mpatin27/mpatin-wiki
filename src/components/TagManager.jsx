import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Trash2, Edit2, Check, Loader2, Tag } from 'lucide-react';
import ConfirmModal from './ConfirmModal'; // <--- IMPORT

export default function TagManager({ isOpen, onClose, onRename, onDelete }) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [newValue, setNewValue] = useState('');
  
  // State pour la modale de suppression
  const [tagToDelete, setTagToDelete] = useState(null);

  // Gestion touche Echap
  useEffect(() => {
    const handleKeyDown = (e) => {
      // On ferme la modale de suppression si elle est ouverte, sinon le manager
      if (e.key === 'Escape') {
        if (tagToDelete) setTagToDelete(null);
        else onClose();
      }
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, tagToDelete]);

  const fetchTags = async () => {
    setLoading(true);
    const { data } = await supabase.from('wiki_posts').select('tags');
    if (data) {
      const allTags = data.flatMap(post => post.tags || []);
      const uniqueTags = [...new Set(allTags)].sort();
      setTags(uniqueTags);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchTags();
  }, [isOpen]);

  // 1. Demande de suppression
  const requestDelete = (tag) => {
    setTagToDelete(tag);
  };

  // 2. Confirmation réelle
  const confirmDelete = async () => {
    if (!tagToDelete) return;
    setLoading(true);
    
    const { error } = await supabase.rpc('delete_global_tag', { tag_to_delete: tagToDelete });
    
    if (error) {
      alert(error.message);
    } else {
      await fetchTags();
      // AJOUT ICI : On prévient le parent (Admin) qu'un tag a disparu
      if (onDelete) onDelete(tagToDelete);
    }
    
    setTagToDelete(null);
    setLoading(false);
  };

  const startEdit = (tag) => {
    setEditingTag(tag);
    setNewValue(tag);
  };

  const handleRename = async () => {
    if (!newValue.trim() || newValue === editingTag) {
      setEditingTag(null);
      return;
    }

    setLoading(true);
    const { error } = await supabase.rpc('rename_global_tag', { 
      old_tag: editingTag, 
      new_tag: newValue.trim() 
    });

    if (error) alert(error.message);
    else {
      if (onRename) onRename(editingTag, newValue.trim());
      setEditingTag(null);
      await fetchTags();
    }
    setLoading(false);
  };

  

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-enter"
      onClick={onClose} 
    >
      <div 
        className="bg-wiki-surface border border-wiki-border rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="flex justify-between items-center p-4 border-b border-wiki-border">
          <h3 className="font-bold text-wiki-text flex items-center gap-2">
            <Tag size={18} className="text-wiki-accent"/> Gestion des Tags
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-wiki-bg rounded-md transition-colors">
            <X size={18} className="text-wiki-muted"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
          {loading && tags.length === 0 ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-wiki-accent"/></div>
          ) : tags.length === 0 ? (
            <div className="text-center p-8 text-wiki-muted text-sm">Aucun tag dans le système.</div>
          ) : (
            tags.map(tag => (
              <div key={tag} className="group flex items-center justify-between p-2 rounded-lg hover:bg-wiki-bg transition-colors border border-transparent hover:border-wiki-border/50">
                {editingTag === tag ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input 
                      autoFocus
                      className="bg-wiki-surface border border-wiki-accent rounded px-2 py-1 text-sm text-wiki-text w-full outline-none"
                      value={newValue}
                      onChange={e => setNewValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRename()}
                    />
                    <button onClick={handleRename} className="text-emerald-400 hover:bg-emerald-400/10 p-1 rounded"><Check size={14}/></button>
                    <button onClick={() => setEditingTag(null)} className="text-red-400 hover:bg-red-400/10 p-1 rounded"><X size={14}/></button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-wiki-text font-mono ml-2">{tag}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(tag)} className="p-1.5 text-wiki-muted hover:text-blue-400 hover:bg-blue-400/10 rounded"><Edit2 size={14} /></button>
                      
                      {/* BOUTON SUPPRIMER MODIFIÉ */}
                      <button 
                        onClick={() => requestDelete(tag)} 
                        className="p-1.5 text-wiki-muted hover:text-red-500 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="p-3 border-t border-wiki-border bg-wiki-bg/50 text-[10px] text-wiki-muted text-center rounded-b-xl">
          Supprimer un tag le retire de tous les articles. Irréversible.
        </div>
      </div>

      {/* LA MODALE DE CONFIRMATION */}
      {/* On force un z-index élevé car TagManager est déjà en z-[100] */}
      <div className="relative z-[150]">
        <ConfirmModal 
            isOpen={!!tagToDelete}
            onClose={() => setTagToDelete(null)}
            onConfirm={confirmDelete}
            title="Supprimer ce tag ?"
            message={`Voulez-vous vraiment supprimer le tag "${tagToDelete}" ? Il sera retiré de tous les articles qui l'utilisent.`}
            confirmText="Supprimer définitivement"
        />
      </div>
    </div>
  );
}