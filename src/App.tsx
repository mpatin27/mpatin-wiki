import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import ReactMarkdown from 'react-markdown';
import { Search, Book, Menu, Edit, LogOut, User, Lock } from 'lucide-react';

// IMPORTS COMPOSANTS
import FileTree from './components/FileTree';
import CommandPalette from './components/CommandPalette';
import StatusBar from './components/StatusBar';
import CodeBlock from './components/CodeBlock';

// IMPORTS PAGES
import Login from './pages/Login';
import Admin from './pages/Admin';

// --- COMPOSANT PAGE WIKI ---
const WikiPage = ({ posts }) => {
  const loc = useLocation();
  const slug = loc.pathname.split('/').pop();
  const post = posts.find(p => p.slug === slug);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  if (!post) return <div className="p-20 text-center text-wiki-muted">Article introuvable</div>;

  return (
    <div className="max-w-5xl mx-auto p-10 animate-enter pb-20">
      <div className="mb-8 pb-6 border-b border-wiki-border flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-sm text-wiki-accent mb-2 font-mono bg-wiki-accent/10 w-fit px-2 py-1 rounded">
            <span>{post.folder}</span><span>/</span><span>{post.slug}</span>
          </div>
          <h1 className="text-4xl font-bold text-wiki-text tracking-tight">{post.title}</h1>
        </div>
        {session && (
          <Link to={`/admin/${post.slug}`} className="flex items-center gap-2 text-sm text-wiki-muted hover:text-wiki-accent bg-wiki-surface border border-wiki-border px-3 py-1.5 rounded-lg transition-colors">
            <Edit size={14} /> Modifier
          </Link>
        )}
      </div>

      <div className="prose prose-invert prose-slate max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-p:text-wiki-muted prose-p:leading-relaxed prose-code:text-wiki-accent prose-code:bg-wiki-surface prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-transparent prose-pre:p-0 prose-pre:border-none prose-img:rounded-xl prose-img:border prose-img:border-wiki-border">
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '')
              return !inline && match ? (
                <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
              ) : <code className={className} {...props}>{children}</code>
            }
          }}
        >
          {post.content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

// --- LAYOUT PRINCIPAL ---
function AppContent() {
  const [posts, setPosts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false); // État remonté ici
  const [session, setSession] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  const currentSlug = location.pathname.startsWith('/wiki/') ? location.pathname.split('/wiki/')[1] : null;
  const currentPost = currentSlug ? posts.find(p => p.slug === currentSlug) : null;

  useEffect(() => {
    // Charger posts
    const fetch = async () => {
      const { data } = await supabase.from('wiki_posts').select('*').eq('is_public', true);
      if (data) setPosts(data);
    };
    fetch();

    // Gérer session
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-screen bg-wiki-bg text-wiki-text overflow-hidden font-sans selection:bg-wiki-accent/30">

      {/* --- SIDEBAR CORRIGÉE --- */}
      <aside className={`
        ${sidebarOpen ? 'w-72' : 'w-0'} 
        bg-wiki-surface/50 border-r border-wiki-border flex flex-col transition-all duration-300 backdrop-blur-xl z-20 overflow-hidden whitespace-nowrap
      `}>
        <div className="p-5 border-b border-wiki-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 shrink-0">W</div>
          <span className="font-bold text-lg tracking-tight">Wiki<span className="text-wiki-accent">OS</span></span>
        </div>

        {/* BOUTON RECHERCHE FONCTIONNEL */}
        <div className="p-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center gap-2 bg-wiki-bg border border-wiki-border rounded-lg px-3 py-2 text-sm text-wiki-muted hover:border-wiki-accent/50 transition-colors text-left"
          >
            <Search size={14} className="shrink-0" />
            <span className="truncate">Search... (Ctrl+K)</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
          <h3 className="text-xs font-bold text-wiki-muted uppercase tracking-wider px-4 mb-2 mt-2">Explorer</h3>
          <FileTree posts={posts} />
        </div>

        {/* FOOTER SIDEBAR (AVEC LOGOUT) */}
        <div className="p-4 border-t border-wiki-border text-xs text-wiki-muted flex justify-between items-center bg-wiki-surface/30">
          {session ? (
            <div className="flex items-center gap-2 w-full justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span>Admin</span>
              </div>
              <button onClick={handleLogout} title="Se déconnecter" className="hover:text-red-400 transition-colors">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex justify-between w-full">
              <span>v2.4.0</span>
              <Link to="/login" className="hover:text-wiki-accent"><User size={12} /></Link>
            </div>
          )}
        </div>
      </aside>

      {/* --- CONTENU PRINCIPAL --- */}
      <main className="flex-1 flex flex-col relative bg-gradient-to-br from-wiki-bg to-[#0b101b] min-w-0">

        <header className="h-12 border-b border-wiki-border flex items-center px-4 bg-wiki-bg/80 backdrop-blur sticky top-0 z-10 font-mono text-sm shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-wiki-surface rounded-md mr-3 text-wiki-muted transition-colors">
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2 text-wiki-muted overflow-hidden whitespace-nowrap">
            <span className="text-wiki-accent">root@wiki</span><span className="text-wiki-border">/</span><span>~</span>
            {currentPost ? (
              <><span className="text-wiki-border">/</span><span>{currentPost.folder}</span><span className="text-wiki-border">/</span><span className="text-wiki-text font-bold truncate">{currentPost.title}</span></>
            ) : (
              <><span className="text-wiki-border">/</span><span className="text-wiki-text">home</span></>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scroll-smooth relative custom-scrollbar">
          <Routes>
            <Route path="/" element={
              <div className="h-full flex flex-col items-center justify-center p-10 text-center">
                <div className="w-20 h-20 bg-wiki-surface rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/10 border border-wiki-border animate-enter">
                  <Book size={40} className="text-wiki-accent" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">Bienvenue sur Wiki OS</h1>
                <p className="text-wiki-muted max-w-md text-lg leading-relaxed">
                  Base de connaissance système centralisée.<br />
                  Utilisez <kbd className="bg-wiki-surface border border-wiki-border rounded px-1 text-xs">CTRL+K</kbd> pour naviguer.
                </p>
                {!session && <Link to="/login" className="mt-8 text-xs text-wiki-muted hover:text-wiki-accent flex items-center gap-1"><Lock size={12} /> Accès Admin</Link>}
              </div>
            } />
            <Route path="/wiki/:slug" element={<WikiPage posts={posts} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/:slug" element={<Admin />} />
          </Routes>
        </div>

        <StatusBar postCount={posts.length} />
      </main>

      {/* --- PALETTE AVEC PROPS --- */}
      <CommandPalette posts={posts} isOpen={paletteOpen} setIsOpen={setPaletteOpen} />
    </div>
  );
}

export default function App() {
  return <BrowserRouter><AppContent /></BrowserRouter>;
}