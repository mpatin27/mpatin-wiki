import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, ArrowRight, X } from 'lucide-react';

export default function CommandPalette({ posts, isOpen, setIsOpen, initialSearch = '' }) {
  const [query, setQuery] = useState(initialSearch);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // 1. Synchroniser la recherche si on l'ouvre via un Tag
  useEffect(() => {
    setQuery(initialSearch);
  }, [initialSearch, isOpen]);

  // 2. FOCUS AUTOMATIQUE à l'ouverture
  useEffect(() => {
    if (isOpen) {
      // Petit délai pour laisser le temps au DOM de s'afficher
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // 3. GESTION DE LA TOUCHE ECHAP (La correction demandée)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Filtrage des résultats
  const filteredPosts = posts.filter(post => {
    if (!query) return false;
    const search = query.toLowerCase();
    return (
      post.title.toLowerCase().includes(search) ||
      post.tags?.some(tag => tag.toLowerCase().includes(search)) ||
      post.folder?.toLowerCase().includes(search)
    );
  });

  const handleSelect = (slug) => {
    navigate(`/wiki/${slug}`);
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-4 animate-enter"
      // 4. Fermer si on clique sur le fond gris
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="w-full max-w-xl bg-wiki-bg border border-wiki-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]"
        onClick={e => e.stopPropagation()} // Empêche la fermeture si on clique DANS la boîte
      >
        
        {/* Barre de recherche */}
        <div className="flex items-center gap-3 p-4 border-b border-wiki-border bg-wiki-surface/50">
          <Search className="text-wiki-muted shrink-0" size={20} />
          <input 
            ref={inputRef}
            type="text" 
            className="flex-1 bg-transparent text-lg text-wiki-text placeholder-wiki-muted/50 outline-none"
            placeholder="Rechercher un article, un tag..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={() => setIsOpen(false)} className="text-wiki-muted hover:text-wiki-text transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Résultats */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {!query ? (
            <div className="text-center py-8 text-wiki-muted text-sm">
              Commencez à taper pour rechercher...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8 text-wiki-muted text-sm">
              Aucun résultat pour "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {filteredPosts.map(post => (
                <button
                  key={post.id}
                  onClick={() => handleSelect(post.slug)}
                  className="w-full text-left flex items-center justify-between p-3 rounded-lg hover:bg-wiki-accent hover:text-white group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={18} className="text-wiki-muted group-hover:text-white/80" />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold truncate">{post.title}</span>
                      <div className="flex items-center gap-2 text-xs text-wiki-muted group-hover:text-white/70">
                        <span className="font-mono bg-wiki-bg/50 px-1 rounded border border-wiki-border/50 group-hover:border-white/30">{post.folder}</span>
                        {post.tags?.slice(0, 3).map(tag => (
                          <span key={tag} className="opacity-70">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-wiki-border bg-wiki-bg text-[10px] text-wiki-muted flex justify-end gap-3 px-4">
          <span className="flex items-center gap-1"><kbd className="bg-wiki-surface border border-wiki-border rounded px-1">Esc</kbd> pour fermer</span>
        </div>

      </div>
    </div>
  );
}