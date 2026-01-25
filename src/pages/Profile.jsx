import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Mail, Camera, Save, Loader2, Calendar } from 'lucide-react';
import { useToast } from '../components/ToastContext';
import { Lock } from 'lucide-react'; // Ajouter Lock

export default function Profile({ onProfileUpdate }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [session, setSession] = useState(null);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [role, setRole] = useState('user');
  const [createdAt, setCreatedAt] = useState(null);

  const { addToast } = useToast();
  const [newPassword, setNewPassword] = useState('');

  const updatePassword = async () => {
    if (!newPassword) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      addToast(error.message, 'error');
    } else {
      addToast("Mot de passe modifié avec succès !", 'success');
      setNewPassword('');
    }
    setSaving(false);
  };

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;
        
        if (data) {
          setUsername(data.username);
          setAvatarUrl(data.avatar_url);
          setRole(data.role);
          setCreatedAt(session.user.created_at);
        }
      }
    } catch (error) {
      addToast("Erreur chargement profil : " + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username, avatar_url: avatarUrl })
        .eq('id', session.user.id);

      if (error) throw error;
      
      addToast("Profil mis à jour !", 'success');
      if (onProfileUpdate) onProfileUpdate(); // Met à jour la sidebar
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Veuillez sélectionner une image.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload dans Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Récupération URL publique
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setAvatarUrl(data.publicUrl);
      addToast("Image uploadée ! Pensez à sauvegarder.", 'info');

    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-wiki-accent"/></div>;

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10 animate-enter">
      <h1 className="text-3xl font-bold text-wiki-text mb-8 flex items-center gap-3">
        <User className="text-wiki-accent" /> Mon Profil
      </h1>

      <div className="bg-wiki-surface border border-wiki-border rounded-2xl p-8 shadow-xl">
        
        {/* HEADER PROFIL AVEC AVATAR */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-wiki-bg shadow-lg bg-wiki-bg flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-wiki-accent/20 flex items-center justify-center text-wiki-accent text-4xl font-bold uppercase">
                  {username ? username[0] : <User size={48} />}
                </div>
              )}
            </div>
            
            {/* BOUTON UPLOAD CACHÉ SUR L'IMAGE */}
            <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
              <Camera size={32} />
              <input 
                type="file" 
                accept="image/*" 
                onChange={uploadAvatar} 
                disabled={uploading}
                className="hidden" 
              />
            </label>
            
            {uploading && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                <Loader2 className="animate-spin text-white" />
              </div>
            )}
          </div>
          <p className="mt-4 text-xs text-wiki-muted uppercase font-bold tracking-wider">
            {role === 'admin' ? 'Administrateur' : 'Utilisateur Membre'}
          </p>
        </div>

        {/* FORMULAIRE */}
        <div className="space-y-6">
          <div>
            <label className="text-xs font-bold text-wiki-muted mb-1 block uppercase">Email</label>
            <div className="flex items-center gap-3 bg-wiki-bg/50 border border-wiki-border rounded-lg p-3 text-wiki-muted cursor-not-allowed">
              <Mail size={18} />
              <span>{session?.user.email}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-wiki-muted mb-1 block uppercase">Nom d'utilisateur</label>
            <div className="flex items-center gap-3 bg-wiki-bg border border-wiki-border rounded-lg p-3 focus-within:border-wiki-accent focus-within:ring-1 focus-within:ring-wiki-accent/50 transition-all">
              <User size={18} className="text-wiki-muted" />
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="bg-transparent outline-none flex-1 text-wiki-text"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-wiki-muted pt-2">
            <Calendar size={12} />
            <span>Membre depuis le {new Date(createdAt).toLocaleDateString()}</span>
          </div>

          <div className="pt-4 border-t border-wiki-border">
            <h3 className="text-sm font-bold text-wiki-text mb-4 flex items-center gap-2">
              <Lock size={16} className="text-wiki-accent"/> SÉCURITÉ
            </h3>
            
            <label className="text-xs font-bold text-wiki-muted mb-1 block uppercase">Nouveau mot de passe</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-3 bg-wiki-bg border border-wiki-border rounded-lg p-3 focus-within:border-wiki-accent focus-within:ring-1 focus-within:ring-wiki-accent/50 transition-all">
                <Lock size={18} className="text-wiki-muted" />
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Laisser vide pour ne pas changer"
                  className="bg-transparent outline-none flex-1 text-wiki-text placeholder-wiki-muted/50"
                />
              </div>
              {newPassword && (
                <button 
                  onClick={updatePassword}
                  disabled={saving}
                  className="bg-wiki-surface border border-wiki-border text-wiki-text px-4 rounded-lg font-bold hover:bg-wiki-accent hover:text-white hover:border-wiki-accent transition-colors text-xs"
                >
                  Valider
                </button>
              )}
            </div>
          </div>

          <button 
            onClick={updateProfile} 
            disabled={saving}
            className="w-full bg-wiki-accent hover:bg-blue-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Enregistrer les modifications
          </button>
        </div>

      </div>
    </div>
  );
}