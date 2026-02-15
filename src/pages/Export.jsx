import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Download, Upload, FileJson, Database, AlertTriangle, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '../components/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

export default function Manager() {
  const [stats, setStats] = useState({ posts: 0, size: '0 KB' });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  // Calculer la taille approximative de la base
  const fetchStats = async () => {
    const { data } = await supabase.from('wiki_posts').select('*');
    if (data) {
      const jsonString = JSON.stringify(data);
      const bytes = new Blob([jsonString]).size;
      setStats({
        posts: data.length,
        size: (bytes / 1024).toFixed(2) + ' KB'
      });
    }
  };

  // --- 1. EXPORT (BACKUP) ---
  const handleExport = async () => {
    setLoading(true);
    try {
      // On récupère tout : posts, tags, etc.
      const { data: posts } = await supabase.from('wiki_posts').select('*');
      
      if (!posts) throw new Error("Pas de données");

      const backupData = {
        version: "1.0",
        date: new Date().toISOString(),
        posts: posts
      };

      // Création du fichier blob
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      
      // Déclenchement du téléchargement
      const a = document.createElement('a');
      a.href = url;
      a.download = `wiki-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addToast("Sauvegarde téléchargée avec succès !", "success");
    } catch (e) {
      addToast("Erreur export : " + e.message, "error");
    }
    setLoading(false);
  };

  // --- 2. IMPORT (RESTAURATION) ---
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm("Attention : L'importation peut créer des doublons si les articles existent déjà. Continuer ?")) {
      e.target.value = null; // Reset input
      return;
    }

    setImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        
        if (!json.posts || !Array.isArray(json.posts)) {
          throw new Error("Format de fichier invalide");
        }

        // On nettoie les ID pour que Supabase en génère de nouveaux (éviter conflits)
        // OU on garde les ID si on veut écraser (upsert). Ici on fait un "Upsert" basé sur le slug.
        const cleanPosts = json.posts.map(p => ({
          ...p,
          updated_at: new Date() // On marque comme mis à jour maintenant
        }));

        const { error } = await supabase.from('wiki_posts').upsert(cleanPosts, { onConflict: 'slug' });

        if (error) throw error;

        addToast(`${cleanPosts.length} articles restaurés/mis à jour !`, "success");
        fetchStats(); // Maj stats
      } catch (err) {
        addToast("Erreur import : " + err.message, "error");
      }
      setImporting(false);
      e.target.value = null;
    };

    reader.readAsText(file);
  };

  // --- 3. RESET TOTAL (Danger) ---
  const handleResetDatabase = async () => {
    setLoading(true);
    // On ne supprime que les articles, pas les users
    const { error } = await supabase.from('wiki_posts').delete().neq('id', 0); // Hack pour tout supprimer
    
    if (error) {
      addToast("Erreur reset : " + error.message, "error");
    } else {
      addToast("Base de données vidée.", "success");
      fetchStats();
    }
    setLoading(false);
    setShowResetModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 animate-enter">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-wiki-text flex items-center gap-3">
          <Database className="text-wiki-accent" /> Maintenance & Données
        </h1>
        <p className="text-wiki-muted text-sm mt-1">
          Gérez les sauvegardes et l'intégrité des données du Wiki.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARTE EXPORT */}
        <div className="bg-wiki-surface border border-wiki-border rounded-xl p-6 shadow-lg flex flex-col justify-between group hover:border-blue-500/50 transition-colors">
          <div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
              <Download size={24} />
            </div>
            <h3 className="text-xl font-bold text-wiki-text mb-2">Exporter les données</h3>
            <p className="text-sm text-wiki-muted mb-4">
              Téléchargez un fichier JSON contenant tous les articles (`{stats.posts}`), tags et métadonnées. Utile pour les sauvegardes manuelles.
            </p>
            <div className="text-xs font-mono bg-wiki-bg p-2 rounded mb-4 text-wiki-muted">
              Taille estimée : {stats.size}
            </div>
          </div>
          <button 
            onClick={handleExport}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <FileJson size={18} />}
            Télécharger le Backup
          </button>
        </div>

        {/* CARTE IMPORT */}
        <div className="bg-wiki-surface border border-wiki-border rounded-xl p-6 shadow-lg flex flex-col justify-between group hover:border-green-500/50 transition-colors">
          <div>
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 mb-4 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <h3 className="text-xl font-bold text-wiki-text mb-2">Restaurer une sauvegarde</h3>
            <p className="text-sm text-wiki-muted mb-4">
              Importez un fichier `.json` généré par WikiOS. Les articles existants (même slug) seront mis à jour.
            </p>
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/10 p-2 rounded mb-4 border border-green-500/20">
              <CheckCircle size={12} /> Format compatible : JSON v1.0
            </div>
          </div>
          <label className="w-full py-3 bg-wiki-surface border border-wiki-border hover:border-green-500 text-wiki-text hover:text-green-400 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-2 relative overflow-hidden">
            {importing ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
            {importing ? "Importation..." : "Sélectionner un fichier"}
            <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={importing} />
          </label>
        </div>

      </div>

      {/* ZONE DANGER */}
      <div className="mt-10 pt-8 border-t border-wiki-border opacity-80 hover:opacity-100 transition-opacity">
        <h3 className="text-sm font-bold text-red-500 flex items-center gap-2 mb-4 uppercase tracking-wider">
          <AlertTriangle size={16} /> Zone Danger
        </h3>
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-wiki-text text-sm">Tout effacer</p>
            <p className="text-xs text-wiki-muted">Supprime tous les articles de la base de données. Irréversible.</p>
          </div>
          <button 
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
          >
            <Trash2 size={16} /> Reset
          </button>
        </div>
      </div>

      <ConfirmModal 
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetDatabase}
        title="Êtes-vous absolument sûr ?"
        message="Cette action va effacer TOUS les articles du Wiki. Assurez-vous d'avoir fait un export avant."
        confirmText="Oui, tout effacer"
        isDanger={true}
      />

    </div>
  );
}