import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Folder, ChevronDown } from 'lucide-react';

export default function FolderSelector({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Charger les dossiers existants
  useEffect(() => {
    const fetchFolders = async () => {
      const { data } = await supabase.from('wiki_posts').select('folder');
      if (data) {
        const uniqueFolders = [...new Set(data.map(p => p.folder || 'General'))].sort();
        setSuggestions(uniqueFolders);
      }
    };
    fetchFolders();
  }, []);

  // Fermer si on clique ailleurs
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Filtrer les suggestions
  const filtered = suggestions.filter(f => f.toLowerCase().includes((value || '').toLowerCase()));

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input 
          type="text"
          className="w-full bg-wiki-bg border border-wiki-border rounded p-2.5 pl-9 text-wiki-text focus:border-wiki-accent outline-none"
          value={value}
          onChange={e => { onChange(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="ex: linux/docker"
        />
        <Folder size={14} className="absolute left-3 top-3 text-wiki-muted pointer-events-none" />
        <div className="absolute right-3 top-3 text-wiki-muted pointer-events-none">
          <ChevronDown size={14} />
        </div>
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-wiki-surface border border-wiki-border rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
          {filtered.map(folder => (
            <button
              key={folder}
              onClick={() => { onChange(folder); setIsOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-wiki-muted hover:bg-wiki-accent/10 hover:text-wiki-accent flex items-center gap-2"
            >
              <Folder size={14} />
              {folder}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}