import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { Link2, Loader2 } from 'lucide-react';

export default function Backlinks({ currentSlug, currentTitle }) {
  const [backlinks, setBacklinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBacklinks = async () => {
      setLoading(true);
      
      // On cherche les articles dont le contenu contient "[[Titre de la page actuelle]]"
      // Note : C'est une recherche textuelle simple. 
      // Pour être plus robuste, on pourrait chercher le slug, mais comme le WikiLink écrit [[Titre]], on cherche le titre.
      const { data, error } = await supabase
        .from('wiki_posts')
        .select('id, title, slug, folder')
        .neq('slug', currentSlug) // On exclut la page elle-même
        .ilike('content', `%[[${currentTitle}]]%`); // Recherche insensible à la casse

      if (!error && data) {
        setBacklinks(data);
      }
      setLoading(false);
    };

    if (currentTitle) {
      fetchBacklinks();
    }
  }, [currentTitle, currentSlug]);

  if (loading) return null; // On n'affiche rien pendant le chargement pour pas polluer
  if (backlinks.length === 0) return null; // Rien si aucun lien

  return (
    <div className="mt-12 pt-8 border-t border-wiki-border animate-enter">
      <h3 className="text-sm font-bold text-wiki-text flex items-center gap-2 mb-4 uppercase tracking-wider">
        <Link2 size={16} className="text-wiki-accent" /> Rétroliens - Mentionné dans
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {backlinks.map(post => (
          <Link 
            key={post.id} 
            to={`/wiki/${post.slug}`}
            className="group block p-3 bg-wiki-surface border border-wiki-border rounded-lg hover:border-wiki-accent/50 hover:bg-wiki-accent/5 transition-all"
          >
            <div className="text-xs text-wiki-muted font-mono mb-1 group-hover:text-wiki-accent transition-colors">
              {post.folder}/
            </div>
            <div className="font-bold text-wiki-text text-sm truncate">
              {post.title}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}