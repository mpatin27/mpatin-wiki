import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Tag, X } from 'lucide-react';

export default function TagSelector({ selectedTags, onChange }) {
  const [inputValue, setInputValue] = useState('');
  const [existingTags, setExistingTags] = useState([]); 
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  
  // NOUVEAU : Index de l'élément sélectionné au clavier (-1 = aucun)
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef(null);
  const listRef = useRef(null); // Référence pour le scroll auto (optionnel mais propre)

  // 1. Charger les tags
  useEffect(() => {
    const fetchAllTags = async () => {
      const { data } = await supabase.from('wiki_posts').select('tags');
      if (data) {
        const flatTags = data.flatMap(post => post.tags || []);
        const unique = [...new Set(flatTags)].sort();
        setExistingTags(unique);
      }
    };
    fetchAllTags();
  }, []);

  // 2. Filtrer les suggestions + Reset index
  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }
    const lowerInput = inputValue.toLowerCase();
    const filtered = existingTags.filter(tag => 
      tag.toLowerCase().includes(lowerInput) && !selectedTags.includes(tag)
    );
    setSuggestions(filtered);
    setSelectedIndex(-1); // On remet la sélection à zéro quand on tape
  }, [inputValue, existingTags, selectedTags]);

  const addTag = (tagToAdd) => {
    if (selectedTags.includes(tagToAdd)) {
      setInputValue('');
      return;
    }
    onChange([...selectedTags, tagToAdd]);
    setInputValue('');
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  // 3. GESTION CLAVIER AMÉLIORÉE
  const handleKeyDown = (e) => {
    // FLÈCHE BAS
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // On descend, mais on ne dépasse pas la fin de la liste
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } 
    // FLÈCHE HAUT
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // On monte, mais on ne dépasse pas le début (-1 permet de déselectionner)
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } 
    // ENTRÉE
    else if (e.key === 'Enter') {
      e.preventDefault();
      
      // CAS 1 : Une suggestion est surlignée par les flèches -> On la prend
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addTag(suggestions[selectedIndex]);
        return;
      }

      // CAS 2 : Rien de surligné -> Logique standard (Match exact ou Création)
      if (!inputValue.trim()) return;
      const existingMatch = existingTags.find(
        t => t.toLowerCase() === inputValue.trim().toLowerCase()
      );
      if (existingMatch) addTag(existingMatch);
      else addTag(inputValue.trim());
    } 
    // BACKSPACE
    else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      onChange(selectedTags.slice(0, -1));
    }
    // ECHAP
    else if (e.key === 'Escape') {
      inputRef.current?.blur();
      setIsFocused(false);
    }
  };

  const removeTag = (tagToRemove) => {
    onChange(selectedTags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="relative group">
      <div 
        className={`flex flex-wrap items-center gap-2 bg-wiki-bg border rounded-lg p-2 transition-colors ${isFocused ? 'border-wiki-accent ring-1 ring-wiki-accent' : 'border-wiki-border'}`}
        onClick={() => inputRef.current?.focus()}
      >
        <Tag size={14} className="text-wiki-muted ml-1" />
        
        {selectedTags.map(tag => (
          <span key={tag} className="flex items-center gap-1 bg-wiki-surface text-wiki-accent text-xs font-bold px-2 py-1 rounded border border-wiki-border/50 animate-enter">
            {tag}
            <button onClick={(e) => { e.stopPropagation(); removeTag(tag); }} className="hover:text-red-500 transition-colors">
              <X size={12} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          className="flex-1 bg-transparent outline-none text-sm text-wiki-text min-w-[80px] placeholder-wiki-muted/50"
          placeholder={selectedTags.length === 0 ? "Ajouter des tags..." : ""}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        />
      </div>

      {isFocused && suggestions.length > 0 && (
        <div ref={listRef} className="absolute z-50 w-full mt-1 bg-wiki-surface border border-wiki-border rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-enter">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              // CLASSE DYNAMIQUE : Si l'index correspond à la sélection clavier -> Surlignage
              className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between group/item ${
                index === selectedIndex 
                  ? 'bg-wiki-accent text-white' // Style actif (Clavier)
                  : 'text-wiki-text hover:bg-wiki-accent hover:text-white' // Style inactif (Souris)
              }`}
              onClick={() => addTag(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)} // La souris met à jour l'index clavier
            >
              <span>{suggestion}</span>
              <span className={`text-[10px] uppercase tracking-wider font-bold ${index === selectedIndex ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`}>
                Ajouter
              </span>
            </button>
          ))}
        </div>
      )}
      
      {/* Aide visuelle contextuelle */}
      {isFocused && inputValue && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-wiki-surface border border-wiki-border rounded-lg shadow-xl p-2">
            <div className="text-xs text-wiki-muted px-2 py-1">
                Appuyez sur <kbd className="font-bold border border-wiki-border rounded px-1">Entrée</kbd> pour créer <span className="text-wiki-accent font-bold">"{inputValue}"</span>
            </div>
        </div>
      )}
    </div>
  );
}