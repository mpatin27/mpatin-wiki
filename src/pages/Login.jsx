import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, UserPlus, Mail, Lock, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { useToast } from '../components/ToastContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); 
  const [loading, setLoading] = useState(false);
  
  // NOUVEAU : Mode "Mot de passe oublié"
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
  
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/');
    });
  }, [navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'signup') {
      // --- INSCRIPTION ---
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username } }
      });

      if (error) {
        addToast(error.message, 'error');
      } else {
        if (data.user) {
          await supabase.from('profiles').insert([{ id: data.user.id, username: username, role: 'user' }]);
        }
        addToast("Compte créé ! Vous êtes connecté.", 'success');
      }
    } else if (mode === 'login') {
      // --- CONNEXION ---
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        addToast("Erreur : " + error.message, 'error');
      } else {
        addToast("Ravi de vous revoir !", 'success');
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } else if (mode === 'forgot') {
      // --- MOT DE PASSE OUBLIÉ ---
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/update-password', // Redirection vers notre nouvelle page
      });

      if (error) {
        addToast("Erreur : " + error.message, 'error');
      } else {
        addToast("Email de réinitialisation envoyé !", 'success');
        setMode('login'); // Retour au login après envoi
      }
    }
    setLoading(false);
  };

  // Titre dynamique
  const getTitle = () => {
    if (mode === 'signup') return 'Créer un compte';
    if (mode === 'forgot') return 'Mot de passe oublié';
    return 'Connexion';
  };

  return (
    <div className="h-full w-full overflow-y-auto flex items-center justify-center bg-gradient-to-br from-wiki-bg to-[#0b101b] p-4 font-sans animate-enter">
      <div className="w-full max-w-md bg-wiki-surface border border-wiki-border rounded-2xl shadow-2xl relative my-auto">
        
        {/* Header */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-cyan-400 flex items-center justify-center relative shrink-0 rounded-t-2xl">
          <div className="text-white text-center">
             <h1 className="text-3xl font-bold tracking-tight">Wiki<span className="opacity-80">OS</span></h1>
             <p className="text-blue-100 text-sm font-mono mt-1">Base de connaissance</p>
          </div>
          <Link to="/" className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors backdrop-blur-sm">
            <ArrowLeft size={18} />
          </Link>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-wiki-text text-center mb-6">
            {getTitle()}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            
            {/* Champ Username (SignUp uniquement) */}
            {mode === 'signup' && (
               <div className="relative group">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-wiki-muted group-focus-within:text-wiki-accent transition-colors">
                   <UserPlus size={18} />
                 </div>
                 <input
                   type="text"
                   placeholder="Nom d'utilisateur"
                   className="w-full bg-wiki-bg border border-wiki-border text-wiki-text text-sm rounded-lg focus:ring-1 focus:ring-wiki-accent focus:border-wiki-accent block w-full pl-10 p-3 outline-none transition-all"
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}
                   required
                 />
               </div>
            )}

            {/* Champ Email (Toujours visible) */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-wiki-muted group-focus-within:text-wiki-accent transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                placeholder="Adresse email"
                className="w-full bg-wiki-bg border border-wiki-border text-wiki-text text-sm rounded-lg focus:ring-1 focus:ring-wiki-accent focus:border-wiki-accent block w-full pl-10 p-3 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Champ Password (Sauf si forgot password) */}
            {mode !== 'forgot' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-wiki-muted group-focus-within:text-wiki-accent transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  placeholder="Mot de passe"
                  className="w-full bg-wiki-bg border border-wiki-border text-wiki-text text-sm rounded-lg focus:ring-1 focus:ring-wiki-accent focus:border-wiki-accent block w-full pl-10 p-3 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Lien mot de passe oublié */}
            {mode === 'login' && (
              <div className="text-right">
                <button type="button" onClick={() => setMode('forgot')} className="text-xs text-wiki-muted hover:text-wiki-accent transition-colors">
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 text-white bg-wiki-accent hover:bg-blue-600 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-3 text-center transition-all shadow-lg shadow-blue-500/20 mt-6"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                mode === 'signup' ? <UserPlus size={20} /> : 
                mode === 'forgot' ? <KeyRound size={20} /> : <LogIn size={20} />
              )}
              {mode === 'signup' ? 'S\'inscrire' : mode === 'forgot' ? 'Envoyer le lien' : 'Se connecter'}
            </button>

            {/* Navigation bas de page */}
            <div className="text-sm font-medium text-wiki-muted text-center mt-4">
              {mode === 'login' && (
                <>Pas encore de compte ? <button type="button" onClick={() => setMode('signup')} className="text-wiki-accent hover:underline font-bold">Inscrivez-vous</button></>
              )}
              {mode === 'signup' && (
                <>Déjà un compte ? <button type="button" onClick={() => setMode('login')} className="text-wiki-accent hover:underline font-bold">Connectez-vous</button></>
              )}
              {mode === 'forgot' && (
                <button type="button" onClick={() => setMode('login')} className="text-wiki-accent hover:underline font-bold">Retour à la connexion</button>
              )}
            </div>
          </form>
        </div>
        
        <div className="bg-wiki-bg/50 p-3 text-center border-t border-wiki-border rounded-b-2xl">
          <p className="text-[10px] text-wiki-muted">Wiki OS v1.0 • Accès sécurisé</p>
        </div>
      </div>
    </div>
  );
}