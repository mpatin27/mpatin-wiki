import { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import { useReactToPrint } from 'react-to-print';
import { Search, Menu, Edit, LogOut, Home, Loader2, Calendar, Tag, FilePlus, Star, Terminal, LogIn, User, Users, LayoutGrid, Printer, Clock, LayoutDashboard } from 'lucide-react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // Le style des formules

// IMPORTS COMPOSANTS
import FileTree from './components/FileTree';
import CommandPalette from './components/CommandPalette';
import StatusBar from './components/StatusBar';
import CodeBlock from './components/CodeBlock'; // <--- Nouveau composant Code
import TableOfContents from './components/TableOfContents';
import CommentsSection from './components/CommentsSection';
import { useToast } from './components/ToastContext';
import Mermaid from './components/Mermaid';
import { ArticleSkeleton, Skeleton } from './components/SkeletonLoader'; // <--- Nouveau Squelette
import Backlinks from './components/Backlinks';

// IMPORTS UTILITAIRES
import { parseWikiLinks } from './utils/wikiLinkParser';

// IMPORTS PAGES
import HomePage from './pages/Home';
import Login from './pages/Login';
import Admin from './pages/Admin';
import UsersManager from './pages/UsersManager';
import Manager from './pages/Manager';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/Dashboard'; // Importe la page

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
};

// --- WIKI PAGE (VUE ARTICLE) ---
const WikiPage = ({ posts, isLoading, onTagClick, myFavorites, onToggleFavorite, session, isAdmin }) => {
  const loc = useLocation();
  const navigate = useNavigate();
  const slug = loc.pathname.split('/').pop();
  const post = posts.find(p => p.slug === slug);
  const viewedRef = useRef('');
  const { addToast } = useToast();
  const printRef = useRef(null);

  // --- LOGIQUE SCROLL & PROGRESSION ---
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    // On écoute le scroll sur le conteneur principal défini dans AppContent
    const mainContainer = document.getElementById('main-content');

    const handleScroll = () => {
      if (!mainContainer) return;
      const { scrollTop, scrollHeight, clientHeight } = mainContainer;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(progress);
    };

    if (mainContainer) {
      mainContainer.scrollTop = 0; // Reset scroll en haut
      mainContainer.addEventListener('scroll', handleScroll);
    }

    return () => mainContainer?.removeEventListener('scroll', handleScroll);
  }, [slug]);

  // Calcul du temps de lecture (200 mots/min)
  const readingTime = post ? Math.ceil(post.content.split(/\s+/).length / 200) : 1;
  // ------------------------------------

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: post ? post.title : 'Wiki-OS-Article',
    onAfterPrint: () => addToast("Impression lancée !", "success"),
    onPrintError: () => addToast("Erreur lors de l'impression", "error"),
  });

  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Wiki OS`;
      if (viewedRef.current !== post.slug) {
        const viewTimer = setTimeout(async () => {
          const { error } = await supabase.rpc('increment_views', { post_id: post.id });
          if (!error) viewedRef.current = post.slug;
        }, 2000);
        return () => clearTimeout(viewTimer);
      }
      try {
        const history = JSON.parse(localStorage.getItem('wiki_history') || '[]');
        if (!history.find(h => h.id === post.id)) {
          const newHistory = [{ id: post.id, title: post.title, slug: post.slug, folder: post.folder }, ...history].slice(0, 10);
          localStorage.setItem('wiki_history', JSON.stringify(newHistory));
        }
      } catch (e) { console.error(e); }
    } else if (!isLoading) {
      document.title = 'Wiki OS - Article Introuvable';
    }
  }, [post, isLoading]);

  const isFavorite = post && myFavorites.includes(post.id);

  const handleStarClick = () => {
    if (!session) {
      if (confirm("Connectez-vous pour gérer vos favoris !")) navigate('/login', { state: { from: loc } });
      return;
    }
    onToggleFavorite(post.id);
  };

  // Chargement élégant avec Skeleton
  if (isLoading) return <ArticleSkeleton />;
  if (!post) return <NotFound />;

  return (
    <div className="relative">

      {/* BARRE DE PROGRESSION LECTURE */}
      <div className="sticky top-0 left-0 w-full h-1 z-50 bg-transparent">
        <div
          className="h-full bg-wiki-accent shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-100 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto p-6 md:p-10 animate-enter pb-20">

        {/* HEADER ARTICLE */}
        <div className="mb-8 pb-6 border-b border-wiki-border">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
            <div className="w-full overflow-hidden">

              {/* Badge Brouillon */}
              {!post.is_public && (
                <div className="mb-4 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 w-fit">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  MODE BROUILLON
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-wiki-accent mb-3 font-mono bg-wiki-accent/10 w-fit px-2 py-1 rounded"><span>{post.folder}</span><span>/</span><span>{post.slug}</span></div>
              <h1 className="text-3xl md:text-5xl font-bold text-wiki-text tracking-tight break-words">{post.title}</h1>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <button onClick={handlePrint} className="p-2 rounded-lg bg-wiki-surface border border-wiki-border text-wiki-muted hover:text-wiki-text transition-colors" title="Imprimer / PDF"><Printer size={18} /></button>
              <button onClick={handleStarClick} className={`p-2 rounded-lg border transition-all ${isFavorite ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' : 'bg-wiki-surface border-wiki-border text-wiki-muted hover:text-wiki-text'}`}><Star size={18} fill={isFavorite ? "currentColor" : "none"} /></button>
              {isAdmin && (
                <Link to={`/admin/${post.slug}`} className="flex items-center gap-2 text-sm text-wiki-muted hover:text-wiki-accent bg-wiki-surface border border-wiki-border px-4 py-2 rounded-lg transition-colors font-medium">
                  <Edit size={16} /> <span className="hidden sm:inline">Modifier</span>
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-wiki-muted font-mono">
            <div className="flex items-center gap-1.5"><Calendar size={12} /><span>{formatDate(post.updated_at || post.created_at)}</span></div>

            {/* Temps de lecture */}
            <div className="flex items-center gap-1.5 text-wiki-text font-bold">
              <span className="text-wiki-border">|</span>
              <Clock size={12} className="text-wiki-accent" />
              <span>{readingTime} min de lecture</span>
            </div>

            {post.views !== undefined && (
              <div className="flex items-center gap-1.5 text-wiki-accent"><span className="text-wiki-border">|</span><span>{post.views} vues</span></div>
            )}
            {post.tags && post.tags.length > 0 && (<div className="flex items-center gap-2"><span className="text-wiki-border">|</span>{post.tags.map(tag => (<button key={tag} onClick={() => onTagClick(tag)} className="flex items-center gap-1 bg-wiki-surface px-2 py-0.5 rounded text-wiki-accent border border-wiki-border/50 hover:bg-wiki-accent hover:text-white transition-colors cursor-pointer"><Tag size={10} /> {tag}</button>))}</div>)}
          </div>
        </div>

        {/* ZONE IMPRIMABLE */}
        <div
          ref={printRef}
          className="print:p-10 print:bg-white print:text-black print:absolute print:top-0 print:left-0 print:w-full print:z-50"
        >
          <div className="flex items-start">
            <div className="flex-1 min-w-0 prose prose-invert prose-slate max-w-none prose-headings:font-bold prose-h1:text-2xl md:prose-h1:text-3xl prose-p:text-wiki-muted prose-p:leading-relaxed prose-code:text-wiki-accent prose-code:bg-wiki-surface prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-transparent prose-pre:p-0 prose-pre:border-none prose-img:rounded-xl prose-img:border prose-img:border-wiki-border print:prose-headings:text-black print:prose-p:text-black print:prose-code:text-black print:prose-code:bg-gray-100">

              <h1 className="hidden print:block text-4xl font-bold mb-6 text-black border-b pb-4">{post.title}</h1>

              <ReactMarkdown
                rehypePlugins={[rehypeSlug, rehypeKatex]}
                remarkPlugins={[remarkMath]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');

                    if (!inline && match && match[1] === 'mermaid') {
                      return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                    }

                    // Utilisation de notre CodeBlock amélioré
                    return !inline && match ? (
                      <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                    ) : (
                      <code className={className} {...props}>{children}</code>
                    );
                  }
                }}
              >
                {parseWikiLinks(post.content)}
              </ReactMarkdown>
            </div>

            <div className="print:hidden">
              <TableOfContents content={post.content} />
            </div>
          </div>
        </div>

        {/* RETROLIENS */}
        <div className="print:hidden">
          <Backlinks currentSlug={post.slug} currentTitle={post.title} />
        </div>

        {/* COMMENTAIRES */}
        <div className="print:hidden">
          <CommentsSection postId={post.id} session={session} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
};

// --- APP CONTENT (LAYOUT GLOBAL) ---
function AppContent() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');

  // États Utilisateur
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [myFavorites, setMyFavorites] = useState([]);

  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = session && userProfile?.role === 'admin';

  // INITIALISATION
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchFavorites(session.user.id);
        fetchProfile(session.user.id);
      }
      fetchPosts(session);
    });

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchFavorites(session.user.id);
        fetchProfile(session.user.id);
      } else {
        setMyFavorites([]);
        setUserProfile(null);
      }
      fetchPosts(session);
    });

    const channel = supabase.channel('public:wiki_posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wiki_posts' }, () => {
        supabase.auth.getSession().then(({ data }) => fetchPosts(data.session));
      })
      .subscribe();

    return () => { authListener.unsubscribe(); supabase.removeChannel(channel); };
  }, []);

  // CHARGEMENT DES POSTS (FILTRAGE BROUILLON)
  const fetchPosts = async (currentSession) => {
    let userIsAdmin = false;
    if (currentSession?.user?.id) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentSession.user.id).single();
      userIsAdmin = profile?.role === 'admin';
    }

    let query = supabase.from('wiki_posts').select('*').order('title');

    if (!userIsAdmin) {
      query = query.eq('is_public', true);
    }

    const { data } = await query;
    if (data) setPosts(data);
    setIsLoading(false);
  };

  const fetchFavorites = async (userId) => {
    const { data } = await supabase.from('user_favorites').select('post_id').eq('user_id', userId);
    if (data) setMyFavorites(data.map(row => row.post_id));
  };

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setUserProfile(data);
  };

  const handleToggleFavorite = async (postId) => {
    if (!session) return;
    const userId = session.user.id;
    const isAlreadyFav = myFavorites.includes(postId);

    if (isAlreadyFav) {
      setMyFavorites(prev => prev.filter(id => id !== postId));
      await supabase.from('user_favorites').delete().eq('user_id', userId).eq('post_id', postId);
      addToast("Retiré des favoris", 'info');
    } else {
      setMyFavorites(prev => [...prev, postId]);
      await supabase.from('user_favorites').insert([{ user_id: userId, post_id: postId }]);
      addToast("Ajouté aux favoris", 'success');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    addToast("À bientôt !", 'info');
    navigate('/');
  };

  const handleNavigate = () => { if (window.innerWidth < 768) setSidebarOpen(false); };
  const handleTagClick = (tag) => { setPaletteSearch(tag); setPaletteOpen(true); };

  const favoritePosts = posts.filter(p => myFavorites.includes(p.id));
  const currentSlug = location.pathname.startsWith('/wiki/') ? location.pathname.split('/wiki/')[1] : null;
  const currentPost = currentSlug && posts.length > 0 ? posts.find(p => p.slug === currentSlug) : null;

  return (
    <div className="flex h-screen w-screen bg-wiki-bg text-wiki-text overflow-hidden font-sans selection:bg-wiki-accent/30">

      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-wiki-surface/90 border-r border-wiki-border flex flex-col transition-transform duration-300 backdrop-blur-xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 ${sidebarOpen ? 'md:w-72' : 'md:w-0 md:border-none'} overflow-hidden whitespace-nowrap`}>
        <div className="p-5 border-b border-wiki-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 shrink-0">W</div>
          <span className="font-bold text-lg tracking-tight">Wiki<span className="text-wiki-accent">OS</span></span>
        </div>

        <div className="p-3 space-y-1">
          <button onClick={() => { setPaletteSearch(''); setPaletteOpen(true); if (window.innerWidth < 768) setSidebarOpen(false); }} className="w-full flex items-center gap-2 bg-wiki-bg border border-wiki-border rounded-lg px-3 py-2 text-sm text-wiki-muted hover:border-wiki-accent/50 hover:text-wiki-text transition-colors text-left">
            <Search size={14} className="shrink-0" /><span className="truncate">Rechercher... (Ctrl+K)</span>
          </button>
          <Link to="/" onClick={handleNavigate} className="w-full flex items-center gap-2 bg-transparent hover:bg-wiki-bg border border-transparent hover:border-wiki-border rounded-lg px-3 py-2 text-sm text-wiki-muted hover:text-wiki-accent transition-colors">
            <Home size={14} className="shrink-0" /><span className="truncate font-medium">Accueil</span>
          </Link>

          {isAdmin && (
            <>
              <Link to="/dashboard" onClick={handleNavigate} className="w-full flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-sm text-orange-400 hover:bg-orange-500 hover:text-white transition-colors">
                <LayoutDashboard size={14} className="shrink-0" />
                <span className="truncate font-bold">Tableau de Bord</span>
              </Link>
              <Link to="/users" onClick={handleNavigate} className="w-full flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 text-sm text-purple-400 hover:bg-purple-500 hover:text-white transition-colors">
                <Users size={14} className="shrink-0" /><span className="truncate font-bold">Gérer Utilisateurs</span>
              </Link>
              <Link to="/manager" onClick={handleNavigate} className="w-full flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-sm text-green-400 hover:bg-green-500 hover:text-white transition-colors">
                <LayoutGrid size={14} className="shrink-0" /><span className="truncate font-medium">Gestion Contenu</span>
              </Link>
              <Link to="/admin" onClick={handleNavigate} className="w-full flex items-center gap-2 bg-wiki-accent/10 border border-wiki-accent/20 rounded-lg px-3 py-2 text-sm text-wiki-accent hover:bg-wiki-accent hover:text-white transition-colors">
                <FilePlus size={14} className="shrink-0" /><span className="truncate font-bold">Nouvel Article</span>
              </Link>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
          {session && favoritePosts.length > 0 && (
            <div className="mb-4 animate-enter">
              <h3 className="text-xs font-bold text-wiki-muted uppercase tracking-wider px-4 mb-2 mt-2 flex items-center gap-2"><Star size={10} className="text-yellow-500 fill-yellow-500" /> Mes Favoris</h3>
              <div className="space-y-0.5">{favoritePosts.map(fav => (<Link key={fav.id} to={`/wiki/${fav.slug}`} onClick={handleNavigate} className="block px-4 py-1.5 text-sm text-wiki-muted hover:text-wiki-text hover:bg-wiki-surface/50 rounded-md transition-colors truncate">{fav.title}</Link>))}</div>
            </div>
          )}
          <h3 className="text-xs font-bold text-wiki-muted uppercase tracking-wider px-4 mb-2 mt-2 flex items-center gap-2"><Terminal size={10} /> Fichiers</h3>

          {/* Skeleton Loader pour la sidebar */}
          {isLoading ? (
            <div className="px-4 space-y-3 mt-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <FileTree posts={posts} onNavigate={handleNavigate} />
          )}
        </div>

        <div className="p-4 border-t border-wiki-border bg-wiki-surface/30">
          {session ? (
            <div className="flex items-center gap-2 w-full justify-between p-2 rounded-lg bg-wiki-bg/50 border border-wiki-border">
              <Link to="/profile" onClick={handleNavigate} className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-70 transition-opacity cursor-pointer group" title="Mon Profil">
                <div className="w-8 h-8 rounded-full bg-wiki-accent/20 flex items-center justify-center text-wiki-accent shrink-0 font-bold uppercase group-hover:bg-wiki-accent group-hover:text-white transition-colors overflow-hidden">
                  {userProfile?.avatar_url ? (
                    <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    userProfile?.username ? userProfile.username[0] : <User size={14} />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-wiki-text truncate max-w-[100px]">{userProfile?.username || 'Chargement...'}</span>
                  <span className={`text-[10px] truncate ${isAdmin ? 'text-purple-400 font-bold' : 'text-wiki-muted'}`}>{isAdmin ? 'Administrateur' : 'Mon Profil'}</span>
                </div>
              </Link>
              <button onClick={handleLogout} title="Se déconnecter" className="text-wiki-muted hover:text-red-400 transition-colors p-1"><LogOut size={16} /></button>
            </div>
          ) : (
            <Link to="/login" state={{ from: location }} onClick={handleNavigate} className="flex items-center justify-center gap-2 w-full bg-wiki-surface hover:bg-wiki-accent/10 border border-wiki-border hover:border-wiki-accent text-wiki-muted hover:text-wiki-accent text-sm font-bold py-3 rounded-lg transition-all shadow-sm">
              <LogIn size={16} /><span>Connexion / Inscription</span>
            </Link>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT - FIXED SCROLLING */}
      <main className="flex-1 flex flex-col relative bg-gradient-to-br from-wiki-bg to-[#0b101b] min-w-0 transition-all duration-300 overflow-hidden">

        <header className="h-12 border-b border-wiki-border flex items-center px-4 bg-wiki-bg/80 backdrop-blur sticky top-0 z-20 font-mono text-sm shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-wiki-surface rounded-md mr-3 text-wiki-muted transition-colors"><Menu size={18} /></button>
          <div className="flex items-center gap-2 text-wiki-muted overflow-hidden whitespace-nowrap">
            <span className="text-wiki-accent hidden sm:inline">wiki</span><span className="text-wiki-border hidden sm:inline">/</span><span className="hidden sm:inline">~</span>
            {currentPost ? (<><span className="text-wiki-border">/</span><span className="truncate font-bold text-wiki-text">{currentPost.title}</span></>) : (<><span className="text-wiki-border">/</span><span className="text-wiki-text">home</span></>)}
          </div>
        </header>

        {/* CONTAINER SCROLLABLE AVEC ID 'main-content' */}
        <div
          id="main-content"
          className="flex-1 relative min-h-0 overflow-y-auto scroll-smooth custom-scrollbar"
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/wiki/:slug" element={<WikiPage posts={posts} isLoading={isLoading} onTagClick={handleTagClick} myFavorites={myFavorites} onToggleFavorite={handleToggleFavorite} session={session} isAdmin={isAdmin} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile onProfileUpdate={() => session && fetchProfile(session.user.id)} />} />
            <Route path="/update-password" element={<UpdatePassword />} />

            {/* ROUTES ADMIN */}
            <Route path="/users" element={isAdmin ? <UsersManager /> : <NotFound />} />
            <Route path="/manager" element={isAdmin ? <Manager /> : <NotFound />} />
            <Route path="/admin" element={isAdmin ? <Admin /> : <NotFound />} />
            <Route path="/admin/:slug" element={isAdmin ? <Admin /> : <NotFound />} />
            <Route path="/dashboard" element={isAdmin ? <Dashboard /> : <NotFound />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>

        <StatusBar postCount={posts.length} />
      </main>

      <CommandPalette posts={posts} isOpen={paletteOpen} setIsOpen={setPaletteOpen} initialSearch={paletteSearch} />
    </div>
  );
}

export default function App() { return <BrowserRouter><AppContent /></BrowserRouter>; }