import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { 
  Search, Menu, LogOut, Home, User, Users, LayoutGrid, 
  LayoutDashboard, Share2, Star, Terminal, FilePlus, LogIn, Bot 
} from 'lucide-react';
import { useToast } from './components/ToastContext';
import { Skeleton } from './components/SkeletonLoader';

// IMPORTS COMPOSANTS GLOBAUX
import FileTree from './components/FileTree';
import CommandPalette from './components/CommandPalette';
import StatusBar from './components/StatusBar';

// IMPORTS PAGES
import HomePage from './pages/Home';
import WikiPage from './pages/WikiPage'; // <--- LE NOUVEL IMPORT
import Login from './pages/Login';
import Admin from './pages/Admin';
import UsersManager from './pages/UsersManager';
import Manager from './pages/Manager';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/Dashboard';
import Export from './pages/Export';
import Generator from './pages/Generator';

// --- APP CONTENT (LAYOUT GLOBAL) ---
function AppContent() {
  // 1. ÉTATS GLOBAUX
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

  // 2. INITIALISATION & LISTENERS
  useEffect(() => {
    // Vérif session au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchFavorites(session.user.id);
        fetchProfile(session.user.id);
      }
      fetchPosts(session);
    });

    // Écoute les changements de connexion
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

    // Écoute les changements dans la DB (Realtime)
    const channel = supabase.channel('public:wiki_posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wiki_posts' }, () => {
        supabase.auth.getSession().then(({ data }) => fetchPosts(data.session));
      })
      .subscribe();

    return () => { authListener.unsubscribe(); supabase.removeChannel(channel); };
  }, []);

  // 3. FONCTIONS DE RÉCUPÉRATION
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

  // 4. HANDLERS GLOBAUX
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

  // Variables calculées pour l'UI
  const currentSlug = location.pathname.startsWith('/wiki/') ? location.pathname.split('/wiki/')[1] : null;
  const currentPost = currentSlug && posts.length > 0 ? posts.find(p => p.slug === currentSlug) : null;

  // --- RENDER ---
  return (
    <div className="flex h-screen w-screen bg-wiki-bg text-wiki-text overflow-hidden font-sans selection:bg-wiki-accent/30">

      {/* OVERLAY MOBILE */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setSidebarOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-wiki-surface/90 border-r border-wiki-border flex flex-col transition-transform duration-300 backdrop-blur-xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 ${sidebarOpen ? 'md:w-72' : 'md:w-0 md:border-none'} overflow-hidden whitespace-nowrap`}>
        
        {/* LOGO */}
        <div className="p-5 border-b border-wiki-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 shrink-0">W</div>
          <span className="font-bold text-lg tracking-tight">Wiki<span className="text-wiki-accent">OS</span></span>
        </div>

        {/* NAVIGATION */}
        <div className="p-3 space-y-1">
          <button onClick={() => { setPaletteSearch(''); setPaletteOpen(true); if (window.innerWidth < 768) setSidebarOpen(false); }} className="w-full flex items-center gap-2 bg-wiki-bg border border-wiki-border rounded-lg px-3 py-2 text-sm text-wiki-muted hover:border-wiki-accent/50 hover:text-wiki-text transition-colors text-left">
            <Search size={14} className="shrink-0" /><span className="truncate">Rechercher... (Ctrl+K)</span>
          </button>
          
          <Link to="/" onClick={handleNavigate} className="w-full flex items-center gap-2 bg-transparent hover:bg-wiki-bg border border-transparent hover:border-wiki-border rounded-lg px-3 py-2 text-sm text-wiki-muted hover:text-wiki-accent transition-colors">
            <Home size={14} className="shrink-0" /><span className="truncate font-medium">Accueil</span>
          </Link>

          {isAdmin && (
            <>
              <div className="pt-2 pb-1 px-2 text-[10px] font-bold text-wiki-muted uppercase">Administration</div>
              <Link to="/dashboard" onClick={handleNavigate} className="w-full flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-sm text-orange-400 hover:bg-orange-500 hover:text-white transition-colors">
                <LayoutDashboard size={14} className="shrink-0" /><span className="truncate font-bold">Tableau de Bord</span>
              </Link>
              <Link to="/users" onClick={handleNavigate} className="w-full flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 text-sm text-purple-400 hover:bg-purple-500 hover:text-white transition-colors">
                <Users size={14} className="shrink-0" /><span className="truncate font-bold">Gestion des Utilisateurs</span>
              </Link>
              <Link to="/manager" onClick={handleNavigate} className="w-full flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-sm text-green-400 hover:bg-green-500 hover:text-white transition-colors">
                <LayoutGrid size={14} className="shrink-0" /><span className="truncate font-medium">Gestion du Contenu</span>
              </Link>
            </>
          )}
        </div>

        {/* ARBORESCENCE FICHIERS */}
        <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
          <h3 className="text-xs font-bold text-wiki-muted uppercase tracking-wider px-4 mb-2 mt-2 flex items-center gap-2"><Terminal size={10} /> Fichiers</h3>
          {isLoading ? (
            <div className="px-4 space-y-3 mt-4">
              <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <FileTree posts={posts} onNavigate={handleNavigate} />
          )}
        </div>

        {/* FOOTER USER */}
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
              <LogIn size={16} /><span>Connexion</span>
            </Link>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative bg-gradient-to-br from-wiki-bg to-[#0b101b] min-w-0 transition-all duration-300 overflow-hidden">
        
        {/* HEADER TOP */}
        <header className="h-12 border-b border-wiki-border flex items-center px-4 bg-wiki-bg/80 backdrop-blur sticky top-0 z-20 font-mono text-sm shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-wiki-surface rounded-md mr-3 text-wiki-muted transition-colors"><Menu size={18} /></button>
          <div className="flex items-center gap-2 text-wiki-muted overflow-hidden whitespace-nowrap">
            <span className="text-wiki-accent hidden sm:inline">wiki</span><span className="text-wiki-border hidden sm:inline">/</span><span className="hidden sm:inline">~</span>
            {currentPost ? (<><span className="text-wiki-border">/</span><span className="truncate font-bold text-wiki-text">{currentPost.title}</span></>) : (<><span className="text-wiki-border">/</span><span className="text-wiki-text">home</span></>)}
          </div>
        </header>

        {/* CONTENT SCROLLABLE */}
        <div id="main-content" className="flex-1 relative min-h-0 overflow-y-auto scroll-smooth custom-scrollbar">
          <Routes>
            <Route path="/" element={<HomePage />} />
            
            {/* VUE ARTICLE (Imports nettoyés) */}
            <Route path="/wiki/:slug" element={
              <WikiPage 
                session={session} 
                isAdmin={isAdmin} 
                myFavorites={myFavorites} 
                onToggleFavorite={handleToggleFavorite}
                onTagClick={handleTagClick}
              />
            } />

            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile onProfileUpdate={() => session && fetchProfile(session.user.id)} />} />
            <Route path="/update-password" element={<UpdatePassword />} />

            {/* ROUTES ADMIN */}
            <Route path="/users" element={isAdmin ? <UsersManager /> : <NotFound />} />
            <Route path="/manager" element={isAdmin ? <Manager /> : <NotFound />} />
            <Route path="/admin" element={isAdmin ? <Admin /> : <NotFound />} />
            <Route path="/admin/:slug" element={isAdmin ? <Admin /> : <NotFound />} />
            <Route path="/dashboard" element={isAdmin ? <Dashboard /> : <NotFound />} />
            <Route path="/export" element={isAdmin ? <Export /> : <NotFound />} />
            <Route path="/generator" element={isAdmin ? <Generator /> : <NotFound />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>

        <StatusBar postCount={posts.length} />
      </main>

      {/* PALETTE COMMANDES */}
      <CommandPalette posts={posts} isOpen={paletteOpen} setIsOpen={setPaletteOpen} initialSearch={paletteSearch} />
    </div>
  );
}

export default function App() { 
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  ); 
}