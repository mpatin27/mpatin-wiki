import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, ArrowLeft, Loader2, Trash2 } from 'lucide-react'; // Ajout Trash2
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null); // Pour éviter de se supprimer soi-même
  const navigate = useNavigate();
  
  // États pour les Modales
  const [userToToggle, setUserToToggle] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null); // NOUVEAU

  // Récupérer l'ID actuel pour sécurité
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) alert("Erreur: " + error.message); else setUsers(data);
    setLoading(false);
  };

  // --- LOGIQUE ROLE (Toggle) ---
  const requestToggle = (user) => setUserToToggle(user);
  
  const confirmToggle = async () => {
    if (!userToToggle) return;
    const newRole = userToToggle.role === 'admin' ? 'user' : 'admin';
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userToToggle.id);
    if (error) alert("Erreur: " + error.message); else fetchUsers();
    setUserToToggle(null);
  };

  // --- LOGIQUE SUPPRESSION (Delete) ---
  const requestDelete = (user) => {
    setUserToDelete(user);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    // Appel de la fonction SQL RPC qu'on vient de créer
    const { error } = await supabase.rpc('delete_user_by_id', { target_user_id: userToDelete.id });

    if (error) {
      alert("Erreur lors de la suppression : " + error.message);
    } else {
      // On retire l'utilisateur de la liste locale pour fluidité
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
    }
    setUserToDelete(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 animate-enter">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-wiki-surface rounded-lg text-wiki-muted"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-bold text-wiki-text flex items-center gap-2"><Shield className="text-wiki-accent" /> Gestion des Utilisateurs</h1>
      </div>

      <div className="bg-wiki-surface border border-wiki-border rounded-xl overflow-hidden shadow-lg">
        {loading ? ( <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-wiki-accent"/></div> ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-wiki-bg border-b border-wiki-border text-wiki-muted uppercase font-bold text-xs">
              <tr><th className="p-4">Utilisateur</th><th className="p-4">Rôle Actuel</th><th className="p-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-wiki-border">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-wiki-bg/50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-wiki-text">{user.username || 'Sans Pseudo'}</div>
                    <div className="text-xs text-wiki-muted">{user.email}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {/* BOUTON ROLE */}
                      <button 
                        onClick={() => requestToggle(user)} 
                        className="text-xs font-bold px-3 py-1.5 rounded bg-wiki-bg border border-wiki-border hover:border-wiki-accent hover:text-wiki-accent transition-colors"
                      >
                        {user.role === 'admin' ? 'Passer User' : 'Passer Admin'}
                      </button>

                      {/* BOUTON SUPPRIMER (Désactivé pour soi-même) */}
                      {currentUser && currentUser.id !== user.id && (
                        <button 
                          onClick={() => requestDelete(user)}
                          className="p-1.5 text-wiki-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          title="Supprimer définitivement"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODALE CHANGEMENT ROLE */}
      <ConfirmModal
        isOpen={!!userToToggle}
        onClose={() => setUserToToggle(null)}
        onConfirm={confirmToggle}
        title="Changer le rôle ?"
        message={userToToggle ? `Passer ${userToToggle.username} en ${userToToggle.role === 'admin' ? 'USER' : 'ADMIN'} ?` : ''}
        confirmText="Confirmer"
        isDanger={false}
      />

      {/* MODALE SUPPRESSION */}
      <ConfirmModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDelete}
        title="Bannir l'utilisateur ?"
        message={userToDelete ? `Êtes-vous sûr de vouloir supprimer définitivement ${userToDelete.username} (${userToDelete.email}) ? Ses commentaires et favoris seront également effacés.` : ''}
        confirmText="Supprimer définitivement"
        isDanger={true}
      />
    </div>
  );
}