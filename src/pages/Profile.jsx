import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Save, ArrowLeft, Loader2 } from 'lucide-react';

// On reçoit la fonction de mise à jour depuis App.jsx
export default function Profile({ onProfileUpdate }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Champs du formulaire
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [message, setMessage] = useState(null);

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/login');
        return;
      }

      setEmail(user.email);

      // Récupérer le pseudo depuis la table publique 'profiles'
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profile) setUsername(profile.username || '');
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage(null);
    let msg = "";

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Mise à jour du PSEUDO (Table profiles)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user.id);

      if (profileError) throw profileError;
      msg += "Pseudo mis à jour. ";

      // 2. Mise à jour EMAIL ou MOT DE PASSE (Auth Supabase)
      const updates = {};
      if (email !== user.email) updates.email = email;
      if (password) updates.password = password;

      if (Object.keys(updates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(updates);
        if (authError) throw authError;
        
        if (updates.email) msg += "Vérifiez votre nouvel email pour confirmer. ";
        if (updates.password) msg += "Mot de passe modifié. ";
      }

      // --- C'EST ICI QUE LA MAGIE OPÈRE ---
      // On dit à App.jsx de recharger le profil (pour la sidebar)
      if (onProfileUpdate) onProfileUpdate(); 
      // -------------------------------------

      setMessage({ type: 'success', text: msg || "Profil mis à jour avec succès !" });
      setPassword(''); // On vide le mot de passe par sécurité

    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-wiki-accent"/></div>;

  return (
    <div className="max-w-2xl mx-auto p-6 animate-enter">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-wiki-surface rounded-lg text-wiki-muted transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-wiki-text flex items-center gap-2">
          <User className="text-wiki-accent" /> Mon Profil
        </h1>
      </div>

      <div className="bg-wiki-surface border border-wiki-border rounded-xl p-6 shadow-lg">
        
        {message && (
          <div className={`p-4 rounded-lg text-sm mb-6 border ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6">
          
          {/* PSEUDO */}
          <div>
            <label className="block text-xs font-bold text-wiki-muted mb-1 ml-1 uppercase">Nom d'utilisateur</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3 text-wiki-muted"/>
              <input 
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-wiki-bg border border-wiki-border rounded-lg p-2.5 pl-10 text-wiki-text focus:border-wiki-accent outline-none focus:ring-1 focus:ring-wiki-accent transition-all"
                placeholder="Votre pseudo"
              />
            </div>
            <p className="text-[10px] text-wiki-muted mt-1 ml-1">Ce nom est visible sur vos commentaires et modifications.</p>
          </div>

          <div className="h-px bg-wiki-border/50 my-6"></div>

          {/* EMAIL */}
          <div>
            <label className="block text-xs font-bold text-wiki-muted mb-1 ml-1 uppercase">Adresse Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-wiki-muted"/>
              <input 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-wiki-bg border border-wiki-border rounded-lg p-2.5 pl-10 text-wiki-text focus:border-wiki-accent outline-none focus:ring-1 focus:ring-wiki-accent transition-all"
              />
            </div>
            <p className="text-[10px] text-yellow-500/80 mt-1 ml-1">Modifier l'email nécessitera une confirmation sur la nouvelle adresse.</p>
          </div>

          {/* MOT DE PASSE */}
          <div>
            <label className="block text-xs font-bold text-wiki-muted mb-1 ml-1 uppercase">Nouveau Mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-wiki-muted"/>
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-wiki-bg border border-wiki-border rounded-lg p-2.5 pl-10 text-wiki-text focus:border-wiki-accent outline-none focus:ring-1 focus:ring-wiki-accent transition-all"
                placeholder="Laisser vide pour ne pas changer"
                minLength={6}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              disabled={updating}
              className="bg-wiki-accent hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {updating ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
              <span>Enregistrer les modifications</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}