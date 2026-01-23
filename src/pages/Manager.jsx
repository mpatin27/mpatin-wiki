import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, Folder, Calendar, Eye, Edit, Trash2, 
  ArrowUpDown, Filter, FileText, LayoutGrid 
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

export default function Manager() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- ÉTATS DES FILTRES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'updated_at', direction: 'desc' });

  // --- ÉTATS SUPPRESSION ---
  const [postToDelete, setPostToDelete] = useState(null);

  // 1. CHARGEMENT
  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('wiki_posts')
      .select('*')
      .order('updated_at', { ascending: false }); // Par défaut : le plus récent en haut
    if (data) setPosts(data);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  // 2. LOGIQUE DE TRI ET FILTRE
  // On récupère la liste unique des dossiers pour le menu déroulant
  const folders = ['All', ...new Set(posts.map(p => p.folder))].sort();

  const filteredPosts = posts
    // A. Filtre Recherche (Titre ou Tags)
    .filter(post => {
      const matchSearch = 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.tags && post.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
      
      const matchFolder = selectedFolder === 'All' || post.folder === selectedFolder;
      
      return matchSearch && matchFolder;
    })
    // B. Tri Dynamique
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  // Fonction pour changer le tri au clic sur une colonne
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // 3. SUPPRESSION
  const confirmDelete = async () => {
    if (!postToDelete) return;
    const { error } = await supabase.from('wiki_posts').delete().eq('id', postToDelete.id);
    
    if (!error) {
      // Mise à jour locale
      setPosts(prev => prev.filter(p => p.id !== postToDelete.id));
      // Nettoyage historique local (optionnel mais propre)
      const history = JSON.parse(localStorage.getItem('wiki_history') || '[]');
      localStorage.setItem('wiki_history', JSON.stringify(history.filter(h => h.id !== postToDelete.id)));
    } else {
      alert(error.message);
    }
    setPostToDelete(null);
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 animate-enter mb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-wiki-text flex items-center gap-3">
            <LayoutGrid className="text-wiki-accent" /> Gestion du Contenu
          </h1>
          <p className="text-wiki-muted text-sm mt-1">
            {filteredPosts.length} article{filteredPosts.length > 1 ? 's' : ''} trouvé{filteredPosts.length > 1 ? 's' : ''}
          </p>
        </div>
        <button 
          onClick={() => navigate('/admin')} 
          className="bg-wiki-accent text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20 text-sm flex items-center gap-2"
        >
          <Edit size={16} /> Créer un Article
        </button>
      </div>

      {/* BARRE D'OUTILS (Filtres) */}
      <div className="bg-wiki-surface border border-wiki-border rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center">
        
        {/* Recherche */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-wiki-muted" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher par titre ou tag..." 
            className="w-full bg-wiki-bg border border-wiki-border rounded-lg pl-10 pr-4 py-2 text-sm text-wiki-text outline-none focus:border-wiki-accent transition-colors"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtre Dossier */}
        <div className="relative w-full md:w-48">
          <Folder className="absolute left-3 top-1/2 -translate-y-1/2 text-wiki-muted" size={16} />
          <select 
            value={selectedFolder}
            onChange={e => setSelectedFolder(e.target.value)}
            className="w-full bg-wiki-bg border border-wiki-border rounded-lg pl-10 pr-8 py-2 text-sm text-wiki-text outline-none focus:border-wiki-accent appearance-none cursor-pointer"
          >
            {folders.map(f => <option key={f} value={f}>{f === 'All' ? 'Tous les dossiers' : f}</option>)}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-wiki-muted pointer-events-none" size={12} />
        </div>
      </div>

      {/* TABLEAU DE GESTION */}
      <div className="bg-wiki-surface border border-wiki-border rounded-xl overflow-hidden shadow-lg overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-wiki-bg border-b border-wiki-border text-wiki-muted uppercase font-bold text-xs">
              <th className="p-4 cursor-pointer hover:text-wiki-accent transition-colors group" onClick={() => handleSort('title')}>
                <div className="flex items-center gap-2">Article <ArrowUpDown size={12} className="opacity-50 group-hover:opacity-100"/></div>
              </th>
              <th className="p-4 cursor-pointer hover:text-wiki-accent transition-colors group" onClick={() => handleSort('folder')}>
                <div className="flex items-center gap-2">Dossier <ArrowUpDown size={12} className="opacity-50 group-hover:opacity-100"/></div>
              </th>
              <th className="p-4 cursor-pointer hover:text-wiki-accent transition-colors group" onClick={() => handleSort('updated_at')}>
                <div className="flex items-center gap-2">Modifié le <ArrowUpDown size={12} className="opacity-50 group-hover:opacity-100"/></div>
              </th>
              <th className="p-4 cursor-pointer hover:text-wiki-accent transition-colors group text-center" onClick={() => handleSort('views')}>
                <div className="flex items-center justify-center gap-2">Vues <ArrowUpDown size={12} className="opacity-50 group-hover:opacity-100"/></div>
              </th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-wiki-border">
            {filteredPosts.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-wiki-muted italic">Aucun article ne correspond à votre recherche.</td>
              </tr>
            ) : (
              filteredPosts.map(post => (
                <tr key={post.id} className="hover:bg-wiki-bg/50 transition-colors group">
                  <td className="p-4">
                    <div className="font-bold text-wiki-text mb-1">{post.title}</div>
                    <div className="flex gap-2">
                      {post.tags?.map(tag => (
                        <span key={tag} className="text-[10px] bg-wiki-bg border border-wiki-border px-1.5 rounded text-wiki-muted">#{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-2 text-wiki-muted font-mono text-xs">
                      <Folder size={12} /> {post.folder}
                    </span>
                  </td>
                  <td className="p-4 text-wiki-muted">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} /> {formatDate(post.updated_at)}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono border ${post.views > 50 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-wiki-bg text-wiki-muted border-wiki-border'}`}>
                      <Eye size={10} /> {post.views || 0}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link to={`/wiki/${post.slug}`} className="p-1.5 text-wiki-muted hover:text-wiki-text hover:bg-wiki-bg rounded" title="Voir">
                        <FileText size={16} />
                      </Link>
                      <Link to={`/admin/${post.slug}`} className="p-1.5 text-wiki-muted hover:text-blue-400 hover:bg-blue-400/10 rounded" title="Modifier">
                        <Edit size={16} />
                      </Link>
                      <button 
                        onClick={() => setPostToDelete(post)} 
                        className="p-1.5 text-wiki-muted hover:text-red-500 hover:bg-red-500/10 rounded" 
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODALE SUPPRESSION */}
      <ConfirmModal
        isOpen={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        onConfirm={confirmDelete}
        title="Supprimer l'article ?"
        message={postToDelete ? `Voulez-vous vraiment supprimer "${postToDelete.title}" ? Cette action est irréversible.` : ''}
        confirmText="Supprimer"
        isDanger={true}
      />
    </div>
  );
}