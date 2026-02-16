import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { Star, Clock, TrendingUp, FileText, Book, Trash2 } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function Home() {
  const [favorites, setFavorites] = useState([]);
  const [trending, setTrending] = useState([]);
  const [history, setHistory] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchData(session?.user?.id);
    });
  }, []);

  const fetchData = async (userId) => {
    setLoading(true);

    // 1. POPULAIRES
    const { data: trendData } = await supabase
      .from('wiki_posts')
      .select('id, title, slug, folder, views')
      .eq('is_public', true)
      .order('views', { ascending: false })
      .limit(5);
    if (trendData) setTrending(trendData);

    // 2. FAVORIS
    if (userId) {
      const { data: favIds } = await supabase.from('user_favorites').select('post_id').eq('user_id', userId);
      if (favIds && favIds.length > 0) {
        const ids = favIds.map(f => f.post_id);
        const { data: favPosts } = await supabase.from('wiki_posts').select('*').in('id', ids).limit(6);
        if (favPosts) setFavorites(favPosts);
      }
    }

    // 3. HISTORIQUE
    const localHistory = JSON.parse(localStorage.getItem('wiki_history') || '[]');
    setHistory(localHistory.slice(0, 5));

    setLoading(false);
  };

  const requestClearHistory = (e) => {
    if (e) e.preventDefault();
    setShowHistoryModal(true);
  };

  const performClearHistory = () => {
    localStorage.removeItem('wiki_history');
    setHistory([]);
    setShowHistoryModal(false);
  };

  // Composant Carte Interne
  const SectionCard = ({ title, icon: Icon, items, emptyMessage, colorClass, onAction, actionIcon: ActionIcon }) => (
    <div className="flex flex-col gap-4 animate-enter">
      <div className="flex justify-between items-center border-b border-wiki-border/50 pb-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-wiki-muted uppercase tracking-wider">
          <Icon size={16} className={colorClass} /> {title}
        </h3>
        {onAction && items.length > 0 && (
          <button 
            onClick={onAction}
            className="text-wiki-muted hover:text-red-500 transition-colors p-1 bg-wiki-surface hover:bg-red-500/10 rounded" 
            title="Effacer la liste"
          >
            <ActionIcon size={14} />
          </button>
        )}
      </div>
      
      <div className="grid gap-3">
        {items.length === 0 ? (
          <div className="p-4 rounded-xl border border-wiki-border border-dashed bg-wiki-surface/30 text-xs text-wiki-muted text-center italic">
            {emptyMessage}
          </div>
        ) : (
          items.map(item => (
            <Link 
              key={item.id} 
              to={`/wiki/${item.slug}`}
              className="group bg-wiki-surface border border-wiki-border hover:border-wiki-accent rounded-xl p-3 transition-all hover:shadow-lg hover:shadow-blue-500/10 flex items-center justify-between gap-3 overflow-hidden"
            >
              {/* PARTIE GAUCHE (Icone + Texte) qui doit prendre la place dispo */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                
                {/* Icone : Ne doit jamais rétrécir (shrink-0) */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-wiki-bg ${colorClass.replace('text-', 'text-opacity-80 bg-opacity-10 bg-')}`}>
                  <FileText size={16} />
                </div>

                {/* Textes : Doivent rétrécir si besoin (min-w-0 + flex-1) */}
                <div className="flex flex-col min-w-0 flex-1">
                   {/* Utilisation de DIV et non SPAN pour que truncate fonctionne bien */}
                   <div className="font-bold text-sm text-wiki-text truncate group-hover:text-wiki-accent transition-colors block" title={item.title}>
                     {item.title}
                   </div>
                   <div className="text-[10px] text-wiki-muted truncate block">
                     {item.folder}
                   </div>
                </div>
              </div>
              
              {/* PARTIE DROITE (Badge Vues) : Ne doit jamais rétrécir */}
              {item.views !== undefined && (
                 <div className="shrink-0">
                    <span className="text-[10px] font-mono text-wiki-muted bg-wiki-bg px-1.5 py-0.5 rounded border border-wiki-border/50 whitespace-nowrap">
                      {item.views} vus
                    </span>
                 </div>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 flex flex-col gap-10 relative">
      
      {/* HERO SECTION */}
      <div className="text-center py-10 animate-enter">
        <div className="w-16 h-16 bg-wiki-surface rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/10 border border-wiki-border">
          <Book size={32} className="text-wiki-accent" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">Wiki OS</h1>
        <p className="text-wiki-muted max-w-md mx-auto text-lg leading-relaxed">
          Base de connaissance centralisée.<br/>
          <span className="text-sm opacity-70">Utilisez <kbd className="bg-wiki-surface border border-wiki-border rounded px-1 text-xs mx-1 font-mono text-wiki-text">CTRL+K</kbd> pour naviguer rapidement.</span>
        </p>
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
        <SectionCard 
          title="Mes Favoris" 
          icon={Star} 
          items={favorites} 
          colorClass="text-yellow-500"
          emptyMessage={session ? "Aucun favori pour l'instant." : "Connectez-vous pour voir vos favoris."}
        />

        <SectionCard 
          title="Reprendre la lecture" 
          icon={Clock} 
          items={history} 
          colorClass="text-blue-400"
          emptyMessage="Votre historique est vide."
          onAction={requestClearHistory}
          actionIcon={Trash2}
        />

        <SectionCard 
          title="Les plus lus" 
          icon={TrendingUp} 
          items={trending} 
          colorClass="text-emerald-400"
          emptyMessage="Pas encore assez de données."
        />
      </div>

      <ConfirmModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onConfirm={performClearHistory}
        title="Effacer l'historique ?"
        message="Voulez-vous vraiment effacer votre historique de lecture local ?"
        confirmText="Effacer"
        isDanger={true}
      />
    </div>
  );
}