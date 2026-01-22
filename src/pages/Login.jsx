import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else navigate('/admin');
  };

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-wiki-surface border border-wiki-border rounded-xl shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-wiki-bg rounded-full border border-wiki-border">
            <Lock className="text-wiki-accent" size={24} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-8 text-wiki-text">Accès Admin</h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-wiki-muted uppercase mb-1">Email</label>
            <input 
              type="email" 
              className="w-full bg-wiki-bg border border-wiki-border rounded-lg p-3 text-wiki-text focus:border-wiki-accent outline-none transition-colors"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-wiki-muted uppercase mb-1">Mot de passe</label>
            <input 
              type="password" 
              className="w-full bg-wiki-bg border border-wiki-border rounded-lg p-3 text-wiki-text focus:border-wiki-accent outline-none transition-colors"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full bg-wiki-accent text-white font-bold py-3 rounded-lg hover:bg-blue-500 transition-colors mt-4">
            Connexion
          </button>
        </form>
      </div>
    </div>
  );
}