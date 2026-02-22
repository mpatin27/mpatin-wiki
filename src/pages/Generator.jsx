import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Plus, Play, Trash2, CheckCircle, 
  XCircle, Loader2, ArrowLeft, FileText, Bot 
} from 'lucide-react';
import { useToast } from '../components/ToastContext';

export default function Generator() {
  const [queue, setQueue] = useState([]); // Liste des titres à générer
  const [inputTitle, setInputTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  // 1. AJOUTER À LA LISTE D'ATTENTE
  const addToQueue = (e) => {
    e.preventDefault();
    if (!inputTitle.trim()) return;
    
    setQueue([...queue, {
      id: Date.now(),
      title: inputTitle,
      status: 'pending', // pending, processing, success, error
      message: ''
    }]);
    setInputTitle('');
  };

  // 2. RETIRER DE LA LISTE
  const removeFromQueue = (id) => {
    if (isProcessing) return; // On ne touche pas pendant que ça tourne
    setQueue(queue.filter(item => item.id !== id));
  };

  // 3. LANCER LA GÉNÉRATION (BOUCLE)
  const startBatchGeneration = async () => {
    if (queue.length === 0) return;
    
    setIsProcessing(true);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      addToast("Clé API Gemini manquante", "error");
      setIsProcessing(false);
      return;
    }

    // On traite les items un par un pour ne pas surcharger l'API
    // On utilise une boucle for...of pour gérer l'async/await séquentiel
    const newQueue = [...queue]; // Copie pour modifs
    
    for (let i = 0; i < newQueue.length; i++) {
      const item = newQueue[i];
      
      // On saute ceux déjà faits
      if (item.status === 'success') continue;

      // Mise à jour UI : En cours
      item.status = 'processing';
      setQueue([...newQueue]); // Force refresh React

      try {
        // A. APPEL GEMINI (Modèle Flash pour la vitesse)
        const prompt = `Rédige un article technique détaillé et structuré au format Markdown sur le sujet : "${item.title}". Utilise des titres, des listes, du gras et des blocs de code si pertinent. L'article doit être pédagogique.`;
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
        );

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error?.message || "Erreur API");
        
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) throw new Error("Réponse vide");

        // B. SAUVEGARDE EN BROUILLON DANS SUPABASE
        const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);
        
        const { error: dbError } = await supabase.from('wiki_posts').insert([{
          title: item.title,
          slug: slug,
          content: content,
          folder: '0.Brouillons_IA', // On les met dans un dossier spécial
          tags: ['IA'],
          is_public: false // IMPORTANT : Brouillon !
        }]);

        if (dbError) throw dbError;

        item.status = 'success';
      } catch (err) {
        console.error(err);
        item.status = 'error';
        item.message = err.message;
      }
      
      // Mise à jour UI : Fini pour cet item
      setQueue([...newQueue]);
      
      // Petite pause pour être gentil avec l'API (1 seconde)
      await new Promise(r => setTimeout(r, 1000));
    }

    setIsProcessing(false);
    addToast("Traitement terminé !", "success");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 animate-enter mb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-wiki-text flex items-center gap-3">
            <Bot className="text-purple-400" /> Générateur IA (Batch)
          </h1>
          <p className="text-wiki-muted text-sm mt-1">
            Ajoutez des titres, l'IA rédigera les brouillons pour vous.
          </p>
        </div>
        <button onClick={() => navigate('/manager')} className="text-wiki-muted hover:text-wiki-text flex items-center gap-2 text-sm">
          <ArrowLeft size={16} /> Retour Gestion
        </button>
      </div>

      {/* INPUT ZONE */}
      <div className="bg-wiki-surface border border-wiki-border rounded-xl p-6 mb-8 shadow-lg">
        <form onSubmit={addToQueue} className="flex gap-4">
          <input 
            type="text" 
            placeholder="Sujet de l'article (ex: Les Design Patterns en Java)" 
            className="flex-1 bg-wiki-bg border border-wiki-border rounded-lg px-4 py-3 text-wiki-text focus:border-wiki-accent outline-none transition-colors"
            value={inputTitle}
            onChange={e => setInputTitle(e.target.value)}
            disabled={isProcessing}
            autoFocus
          />
          <button 
            type="submit" 
            disabled={!inputTitle.trim() || isProcessing}
            className="bg-wiki-accent text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus size={20} /> Ajouter
          </button>
        </form>
      </div>

      {/* LA FILE D'ATTENTE */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
            <h3 className="text-sm font-bold text-wiki-muted uppercase tracking-wider">
                File d'attente ({queue.length})
            </h3>
            {queue.length > 0 && !isProcessing && (
                <button onClick={() => setQueue([])} className="text-xs text-red-400 hover:text-red-300">
                    Tout effacer
                </button>
            )}
        </div>

        {queue.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-wiki-border rounded-xl text-wiki-muted">
                <Sparkles className="mx-auto mb-3 opacity-50" size={32} />
                <p>La liste est vide. Ajoutez des sujets ci-dessus !</p>
            </div>
        ) : (
            <div className="bg-wiki-surface border border-wiki-border rounded-xl overflow-hidden">
                {queue.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border-b border-wiki-border last:border-0 hover:bg-wiki-bg/50 transition-colors">
                        <div className="text-wiki-muted font-mono text-xs w-6">{index + 1}.</div>
                        
                        <div className="flex-1 font-medium text-wiki-text">
                            {item.title}
                            {item.status === 'error' && <span className="text-xs text-red-400 block mt-1">{item.message}</span>}
                        </div>

                        {/* STATUT */}
                        <div className="w-32 flex justify-end">
                            {item.status === 'pending' && <span className="text-xs text-wiki-muted bg-wiki-bg px-2 py-1 rounded border border-wiki-border">En attente</span>}
                            {item.status === 'processing' && <span className="text-xs text-blue-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Génération...</span>}
                            {item.status === 'success' && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={14}/> Brouillon créé</span>}
                            {item.status === 'error' && <span className="text-xs text-red-400 flex items-center gap-1"><XCircle size={14}/> Erreur</span>}
                        </div>

                        {/* ACTION */}
                        <button 
                            onClick={() => removeFromQueue(item.id)}
                            disabled={isProcessing || item.status === 'success'}
                            className="p-2 text-wiki-muted hover:text-red-400 disabled:opacity-0 transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* BOUTON Lancer */}
        {queue.length > 0 && (
            <div className="flex justify-end mt-6">
                <button 
                    onClick={startBatchGeneration}
                    disabled={isProcessing || queue.every(i => i.status === 'success')}
                    className="bg-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg"
                >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
                    {isProcessing ? 'Génération en cours...' : 'Lancer la production'}
                </button>
            </div>
        )}
      </div>

    </div>
  );
}