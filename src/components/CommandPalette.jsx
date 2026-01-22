import { useEffect } from 'react'; // On enlève useState interne
import { Command } from 'cmdk'; 
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Home, PenTool, Lock, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';

// On reçoit isOpen et setIsOpen depuis le parent (App.jsx)
export default function CommandPalette({ posts, isOpen, setIsOpen }) {
  const navigate = useNavigate();

  // Raccourci Clavier (Ctrl+K)
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open); // On utilise la prop du parent
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setIsOpen]);

  const runCommand = (fn) => { setIsOpen(false); fn(); };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[20vh] animate-enter" onClick={() => setIsOpen(false)}>
      <div className="w-full max-w-lg bg-wiki-surface border border-wiki-border rounded-xl shadow-2xl overflow-hidden font-sans" onClick={e => e.stopPropagation()}>
        
        <Command className="w-full" label="Command Menu">
          <div className="flex items-center border-b border-wiki-border px-4 py-3">
            <Search className="w-5 h-5 text-wiki-muted mr-3" />
            <Command.Input 
              autoFocus 
              placeholder="Rechercher un fichier ou une commande..."
              className="w-full bg-transparent text-wiki-text placeholder-wiki-muted outline-none text-base"
            />
            <div className="text-xs text-wiki-muted border border-wiki-border px-1.5 py-0.5 rounded bg-wiki-bg pointer-events-none">ESC</div>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2 scroll-smooth custom-scrollbar">
            <Command.Empty className="py-8 text-center text-sm text-wiki-muted">Aucun résultat trouvé.</Command.Empty>
            
            <Command.Group heading={<span className="text-xs font-bold text-wiki-muted uppercase px-2 mb-2 block">Système</span>}>
              <Item onSelect={() => runCommand(() => navigate('/'))} icon={<Home size={14} />}>Accueil</Item>
              <Item onSelect={() => runCommand(() => navigate('/admin'))} icon={<PenTool size={14} />}>Éditeur (Admin)</Item>
              <Item onSelect={() => runCommand(handleLogout)} icon={<LogOut size={14} />}><span className="text-red-400">Déconnexion</span></Item>
            </Command.Group>

            <Command.Group heading={<span className="text-xs font-bold text-wiki-muted uppercase px-2 mb-2 block mt-2">Fichiers</span>}>
              {posts?.map(post => (
                <Item 
                  key={post.id} 
                  onSelect={() => runCommand(() => navigate(`/wiki/${post.slug}`))}
                  icon={<FileText size={14} />}
                >
                  <span className="text-wiki-text">{post.title}</span>
                  <span className="ml-auto text-xs text-wiki-muted opacity-50">{post.folder}</span>
                </Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function Item({ children, onSelect, icon }) {
  return (
    <Command.Item 
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-wiki-muted hover:bg-wiki-accent/10 hover:text-wiki-accent aria-selected:bg-wiki-accent/10 aria-selected:text-wiki-accent transition-colors"
    >
      {icon}
      {children}
    </Command.Item>
  );
}