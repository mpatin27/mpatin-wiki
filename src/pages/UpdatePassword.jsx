import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, Save, Loader2 } from 'lucide-react';
import { useToast } from '../components/ToastContext';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Supabase gère la session automatiquement via le hash de l'URL
  // On vérifie juste si on a bien une session active (ce qui arrive après le clic email)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        addToast("Lien invalide ou expiré.", "error");
        navigate('/login');
      }
    });
  }, [navigate, addToast]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      addToast("Erreur : " + error.message, 'error');
    } else {
      addToast("Mot de passe modifié avec succès !", 'success');
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-wiki-bg to-[#0b101b] p-4 font-sans animate-enter">
      <div className="w-full max-w-md bg-wiki-surface border border-wiki-border rounded-2xl shadow-2xl p-8">
        <h2 className="text-xl font-bold text-wiki-text text-center mb-6">Nouveau mot de passe</h2>
        <p className="text-sm text-wiki-muted text-center mb-6">
          Saisissez votre nouveau mot de passe pour sécuriser votre compte.
        </p>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-wiki-muted group-focus-within:text-wiki-accent transition-colors">
              <Lock size={18} />
            </div>
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              className="w-full bg-wiki-bg border border-wiki-border text-wiki-text text-sm rounded-lg focus:ring-1 focus:ring-wiki-accent focus:border-wiki-accent block w-full pl-10 p-3 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 text-white bg-wiki-accent hover:bg-blue-600 font-medium rounded-lg text-sm px-5 py-3 transition-all shadow-lg shadow-blue-500/20"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Mettre à jour
          </button>
        </form>
      </div>
    </div>
  );
}