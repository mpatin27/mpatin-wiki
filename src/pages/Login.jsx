import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, UserPlus, LogIn, ArrowLeft, User } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // Nouveau champ
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    let result;
    if (isSignUp) {
      if (!username) {
        setMessage("Le pseudo est obligatoire.");
        setLoading(false);
        return;
      }
      // INSCRIPTION AVEC METADATA (Pseudo)
      result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: username } // Envoyé au trigger SQL
        }
      });
    } else {
      // CONNEXION CLASSIQUE
      result = await supabase.auth.signInWithPassword({ email, password });
    }

    const { error, data } = result;

    if (error) {
      setMessage(error.message);
    } else {
      if (isSignUp && !data.session) {
        setMessage("Inscription réussie ! Vérifiez vos emails.");
      } else {
        navigate(from, { replace: true });
      }
    }
    setLoading(false);
  };

  return (
    <div className="h-full flex items-center justify-center bg-wiki-bg p-4 animate-enter">
      <div className="w-full max-w-md bg-wiki-surface border border-wiki-border p-8 rounded-2xl shadow-2xl relative">
        <button onClick={() => navigate('/')} className="absolute top-4 left-4 text-wiki-muted hover:text-wiki-text transition-colors">
          <ArrowLeft size={20} />
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-wiki-accent/10 rounded-full flex items-center justify-center text-wiki-accent mb-3">
            {isSignUp ? <UserPlus size={24} /> : <Lock size={24} />}
          </div>
          <h1 className="text-2xl font-bold text-wiki-text">{isSignUp ? 'Créer un compte' : 'Connexion'}</h1>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm mb-4 text-center ${message.includes('réussie') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {/* CHAMP PSEUDO (Seulement en inscription) */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-wiki-muted mb-1 ml-1">PSEUDO</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-wiki-muted"/>
                <input 
                  type="text" required
                  className="w-full bg-wiki-bg border border-wiki-border rounded-lg p-3 pl-10 text-wiki-text focus:border-wiki-accent outline-none"
                  placeholder="Pseudo"
                  value={username} onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-wiki-muted mb-1 ml-1">EMAIL</label>
            <input 
              type="email" required
              className="w-full bg-wiki-bg border border-wiki-border rounded-lg p-3 text-wiki-text focus:border-wiki-accent outline-none"
              placeholder="votre@email.com"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-wiki-muted mb-1 ml-1">MOT DE PASSE</label>
            <input 
              type="password" required minLength={6}
              className="w-full bg-wiki-bg border border-wiki-border rounded-lg p-3 text-wiki-text focus:border-wiki-accent outline-none"
              placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button disabled={loading} className="w-full bg-wiki-accent hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-2">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : (isSignUp ? 'S\'inscrire' : 'Se connecter')}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-wiki-border pt-4">
          <button onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }} className="text-sm text-wiki-muted hover:text-wiki-accent transition-colors">
            {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S\'inscrire'}
          </button>
        </div>
      </div>
    </div>
  );
}