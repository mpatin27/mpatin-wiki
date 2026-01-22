import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom'; // useParams pour récupérer l'ID si on édite
import ReactMarkdown from 'react-markdown';
import { Save, Trash2, Image as ImageIcon, ArrowLeft, Loader2 } from 'lucide-react';

export default function Admin() {
  const { slug } = useParams(); // Si URL = /admin/docker-install, on est en mode édition
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Champs du formulaire
  const [id, setId] = useState(null);
  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState('general');
  const [content, setContent] = useState('');

  // 1. Vérif Session + Chargement des données si mode édition
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login');
      setSession(session);
    });

    if (slug) {
      loadPost();
    }
  }, [slug, navigate]);

  const loadPost = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('wiki_posts').select('*').eq('slug', slug).single();
    if (data) {
      setId(data.id);
      setTitle(data.title);
      setFolder(data.folder);
      setContent(data.content);
    }
    setLoading(false);
  };

  // 2. Gestionnaire d'Upload d'Image
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage.from('wiki_images').upload(filePath, file);

    if (uploadError) {
      alert('Erreur upload: ' + uploadError.message);
    } else {
      // Récupérer l'URL publique
      const { data } = supabase.storage.from('wiki_images').getPublicUrl(filePath);
      // Insérer le markdown de l'image à la fin du contenu
      setContent(prev => prev + `\n\n![Image description](${data.publicUrl})\n`);
    }
    setUploading(false);
  };

  // 3. Sauvegarde (Insert ou Update)
  const handleSave = async () => {
    if (!title) return alert("Titre requis");
    const newSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const postData = { title, slug: newSlug, folder, content, is_public: true };

    let error;
    if (id) {
      // Update
      const { error: err } = await supabase.from('wiki_posts').update(postData).eq('id', id);
      error = err;
    } else {
      // Insert
      const { error: err } = await supabase.from('wiki_posts').insert([postData]);
      error = err;
    }

    if (error) alert('Erreur: ' + error.message);
    else {
      navigate(`/wiki/${newSlug}`);
      window.location.reload(); 
    }
  };

  // 4. Suppression
  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet article ? C'est irréversible.")) return;
    const { error } = await supabase.from('wiki_posts').delete().eq('id', id);
    if (!error) {
      navigate('/');
      window.location.reload();
    }
  };

  if (!session) return null;

  return (
    <div className="h-full flex flex-col p-6 max-w-7xl mx-auto font-sans">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-wiki-surface rounded-lg text-wiki-muted">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-wiki-text">
            {id ? 'Modifier l\'article' : 'Nouvel Article'}
          </h1>
        </div>
        
        <div className="flex gap-3">
          {id && (
            <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 border border-red-900 text-red-500 rounded-lg hover:bg-red-900/20 transition-colors">
              <Trash2 size={16} /> <span className="hidden sm:inline">Supprimer</span>
            </button>
          )}
          <button onClick={handleSave} className="flex items-center gap-2 bg-wiki-accent text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20">
            <Save size={16} /> Sauvegarder
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-wiki-accent" /></div>
      ) : (
        <div className="flex-1 flex flex-col gap-6 min-h-0">
          {/* Métatadonnées */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-wiki-surface/30 p-4 rounded-xl border border-wiki-border">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-wiki-muted mb-1 block">TITRE</label>
              <input 
                className="w-full bg-wiki-bg border border-wiki-border rounded-lg p-2.5 text-wiki-text focus:border-wiki-accent outline-none transition-all"
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="ex: Guide Installation Docker"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-wiki-muted mb-1 block">DOSSIER</label>
              <input 
                className="w-full bg-wiki-bg border border-wiki-border rounded-lg p-2.5 text-wiki-text focus:border-wiki-accent outline-none transition-all"
                value={folder} onChange={e => setFolder(e.target.value)}
                placeholder="ex: linux/containers"
              />
            </div>
          </div>

          {/* Éditeur + Upload */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
            <div className="flex flex-col relative">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-wiki-muted">MARKDOWN</label>
                
                {/* Bouton Upload Image */}
                <label className="cursor-pointer flex items-center gap-1 text-xs bg-wiki-surface border border-wiki-border px-2 py-1 rounded hover:text-white transition-colors">
                  {uploading ? <Loader2 size={12} className="animate-spin"/> : <ImageIcon size={12} />}
                  <span>{uploading ? 'Envoi...' : 'Ajouter Image'}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>
              
              <textarea 
                className="flex-1 w-full bg-wiki-surface/50 border border-wiki-border rounded-xl p-4 text-wiki-text font-mono text-sm focus:border-wiki-accent outline-none resize-none leading-relaxed custom-scrollbar"
                value={content} 
                onChange={e => setContent(e.target.value)}
                placeholder="# Commencez à écrire..."
              />
            </div>

            {/* Aperçu */}
            <div className="flex flex-col min-h-0 hidden lg:flex">
              <label className="text-xs font-bold text-wiki-muted mb-2">APERÇU EN DIRECT</label>
              <div className="flex-1 bg-wiki-bg border border-wiki-border rounded-xl p-6 overflow-y-auto prose prose-invert prose-sm max-w-none custom-scrollbar">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}