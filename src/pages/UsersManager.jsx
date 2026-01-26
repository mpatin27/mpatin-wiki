import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Shield, ShieldAlert, User, Loader2, Calendar, UserCheck, XCircle } from 'lucide-react';
import { useToast } from '../components/ToastContext';

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { addToast } = useToast();

  // Chargement des utilisateurs
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    // On récupère tous les profils
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      addToast("Erreur chargement utilisateurs : " + error.message, "error");
    } else {
      setUsers(data);
    }
    setLoading(false);
  };

  // Fonction pour changer le rôle (Admin <-> User)
  const toggleRole = async (userId, currentRole, username) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    // Optimistic UI (Mise à jour immédiate visuelle)
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      addToast("Erreur lors de la mise à jour", "error");
      fetchUsers(); // On recharge en cas d'erreur pour remettre la vraie valeur
    } else {
      addToast(`${username} est maintenant ${newRole === 'admin' ? 'Administrateur' : 'Membre simple'}`, "success");
    }
  };

  // Filtrage pour la recherche
  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 animate-enter mb-20">
      
      {/* EN-TÊTE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-wiki-text flex items-center gap-3">
            <UsersIconGroup /> Gestion des Utilisateurs
          </h1>
          <p className="text-wiki-muted text-sm mt-1">
            Gérez les rôles et les accès des {users.length} membres de la communauté.
          </p>
        </div>
        
        {/* BARRE DE RECHERCHE */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-wiki-muted" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un membre..." 
            className="w-full bg-wiki-surface border border-wiki-border rounded-lg pl-10 pr-4 py-2 text-sm text-wiki-text outline-none focus:border-wiki-accent transition-colors"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* LISTE DES UTILISATEURS */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={40} className="animate-spin text-wiki-accent"/></div>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-wiki-muted italic border border-dashed border-wiki-border rounded-xl">
              Aucun utilisateur trouvé.
            </div>
          ) : (
            filteredUsers.map(user => (
              <div key={user.id} className="bg-wiki-surface border border-wiki-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 hover:border-wiki-accent/50 transition-colors group">
                
                {/* INFO UTILISATEUR */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-wiki-bg border border-wiki-border flex items-center justify-center overflow-hidden shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-lg text-wiki-muted uppercase">{user.username?.[0] || '?'}</span>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-wiki-text text-lg">{user.username || 'Inconnu'}</h3>
                      {user.role === 'admin' && (
                        <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <Shield size={10} fill="currentColor" /> ADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-wiki-muted flex items-center gap-2 mt-1">
                      <Calendar size={12} /> Inscrit le {new Date(user.created_at || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                   {/* Bouton Toggle Admin */}
                   <button 
                     onClick={() => toggleRole(user.id, user.role, user.username)}
                     className={`
                       px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg
                       ${user.role === 'admin' 
                         ? 'bg-wiki-bg text-wiki-muted border border-wiki-border hover:border-red-500 hover:text-red-500' 
                         : 'bg-wiki-accent text-white hover:bg-blue-600 shadow-blue-500/20'}
                     `}
                   >
                     {user.role === 'admin' ? (
                       <>
                         <XCircle size={16} /> Rétrograder
                       </>
                     ) : (
                       <>
                         <ShieldAlert size={16} /> Passer Admin
                       </>
                     )}
                   </button>
                </div>

              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Petit composant icône décoratif
const UsersIconGroup = () => (
  <div className="flex -space-x-2">
     <div className="w-8 h-8 rounded-full bg-wiki-surface border-2 border-wiki-bg flex items-center justify-center z-20"><UserCheck size={16} className="text-green-400"/></div>
     <div className="w-8 h-8 rounded-full bg-wiki-surface border-2 border-wiki-bg flex items-center justify-center z-10"><Shield size={16} className="text-purple-400"/></div>
  </div>
);