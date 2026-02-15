import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Shield, UserCheck, Loader2, Edit, Trash2, X, Save, Mail } from 'lucide-react'; // J'ai nettoyé les imports inutilisés
import { useToast } from '../components/ToastContext';

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { addToast } = useToast();

  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', avatar_url: '', role: 'user' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      addToast("Erreur chargement : " + error.message, "error");
    } else {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      avatar_url: user.avatar_url || '',
      role: user.role || 'user'
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        username: formData.username,
        avatar_url: formData.avatar_url,
        role: formData.role
      })
      .eq('id', editingUser.id);

    if (error) {
      addToast("Erreur lors de la mise à jour", "error");
    } else {
      addToast("Utilisateur mis à jour !", "success");
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
      setEditingUser(null);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement ${username} ? Cette action est irréversible.`)) return;

    const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId });

    if (error) {
      addToast("Erreur suppression : " + error.message, "error");
    } else {
      addToast(`Utilisateur ${username} supprimé.`, "success");
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleSendResetPassword = async (email) => {
    if (!email) return addToast("Email introuvable", "error");
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password',
    });

    if (error) addToast("Erreur envoi mail : " + error.message, "error");
    else addToast("Email de réinitialisation envoyé !", "success");
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* --- CONTENU PRINCIPAL (Avec animation) --- */}
      <div className="max-w-6xl mx-auto p-6 md:p-10 animate-enter mb-20 relative">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-wiki-text flex items-center gap-3">
              <UsersIconGroup /> Gestion des Utilisateurs
            </h1>
            <p className="text-wiki-muted text-sm mt-1">
              Gérez les rôles, modifiez les profils et supprimez les comptes.
            </p>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-wiki-muted" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="w-full bg-wiki-surface border border-wiki-border rounded-lg pl-10 pr-4 py-2 text-sm text-wiki-text outline-none focus:border-wiki-accent transition-colors"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={40} className="animate-spin text-wiki-accent"/></div>
        ) : (
          <div className="grid gap-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 text-wiki-muted italic border border-dashed border-wiki-border rounded-xl">Aucun utilisateur trouvé.</div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.id} className="bg-wiki-surface border border-wiki-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 hover:border-wiki-accent/50 transition-colors group">
                  
                  <div className="flex items-center gap-4 w-full md:w-auto overflow-hidden">
                    <div className="w-12 h-12 rounded-full bg-wiki-bg border border-wiki-border flex items-center justify-center overflow-hidden shrink-0">
                      {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <span className="font-bold text-lg text-wiki-muted uppercase">{user.username?.[0] || '?'}</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-wiki-text text-lg truncate">{user.username || 'Inconnu'}</h3>
                        {user.role === 'admin' && <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Shield size={10} fill="currentColor" /> ADMIN</span>}
                      </div>
                      <div className="text-xs text-wiki-muted flex items-center gap-2 mt-1 truncate">
                        <span className="opacity-50">ID: {user.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                     <button onClick={() => handleEditClick(user)} className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors" title="Modifier"><Edit size={18} /></button>
                     <button onClick={() => handleDeleteUser(user.id, user.username)} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" title="Supprimer définitivement"><Trash2 size={18} /></button>
                  </div>

                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* --- MODALE D'ÉDITION (HORS DU DIV ANIMÉ) --- */}
      {/* Le z-index 100 assure qu'elle passe au-dessus de tout */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
          <div className="bg-wiki-surface border border-wiki-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-enter" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-wiki-border flex justify-between items-center bg-wiki-bg">
              <h3 className="font-bold text-wiki-text">Modifier {editingUser.username}</h3>
              <button onClick={() => setEditingUser(null)} className="text-wiki-muted hover:text-white"><X size={20}/></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-wiki-muted mb-1 block">PSEUDO</label>
                <input className="w-full bg-wiki-bg border border-wiki-border rounded-lg p-2 text-wiki-text focus:border-wiki-accent outline-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
              </div>

              <div>
                <label className="text-xs font-bold text-wiki-muted mb-1 block">URL AVATAR</label>
                <input className="w-full bg-wiki-bg border border-wiki-border rounded-lg p-2 text-wiki-text focus:border-wiki-accent outline-none font-mono text-xs" value={formData.avatar_url} onChange={e => setFormData({...formData, avatar_url: e.target.value})} />
              </div>

              <div>
                <label className="text-xs font-bold text-wiki-muted mb-1 block">RÔLE</label>
                <div className="flex gap-2">
                  <button onClick={() => setFormData({...formData, role: 'user'})} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${formData.role === 'user' ? 'bg-wiki-accent text-white border-wiki-accent' : 'bg-wiki-bg border-wiki-border text-wiki-muted'}`}>Membre</button>
                  <button onClick={() => setFormData({...formData, role: 'admin'})} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${formData.role === 'admin' ? 'bg-purple-600 text-white border-purple-600' : 'bg-wiki-bg border-wiki-border text-wiki-muted'}`}>Admin</button>
                </div>
              </div>

              <div className="pt-4 border-t border-wiki-border mt-4">
                 <p className="text-[10px] text-wiki-muted mb-2">SÉCURITÉ</p>
                 <button onClick={() => handleSendResetPassword(editingUser.username + "@example.com")} className="w-full flex items-center justify-center gap-2 bg-wiki-bg border border-wiki-border hover:bg-wiki-surface text-wiki-text py-2 rounded-lg text-sm font-medium transition-colors">
                   <Mail size={14} /> Envoyer mail réinitialisation MDP
                 </button>
              </div>
            </div>

            <div className="p-4 bg-wiki-bg border-t border-wiki-border flex justify-end gap-3">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-lg text-wiki-muted hover:text-white transition-colors text-sm font-bold">Annuler</button>
              <button onClick={handleSaveUser} className="px-4 py-2 bg-wiki-accent text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"><Save size={16} /> Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const UsersIconGroup = () => (
  <div className="flex -space-x-2">
     <div className="w-8 h-8 rounded-full bg-wiki-surface border-2 border-wiki-bg flex items-center justify-center z-20"><UserCheck size={16} className="text-green-400"/></div>
     <div className="w-8 h-8 rounded-full bg-wiki-surface border-2 border-wiki-bg flex items-center justify-center z-10"><Shield size={16} className="text-purple-400"/></div>
  </div>
);