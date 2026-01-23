import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Save, Trash2, Image as ImageIcon, ArrowLeft, Loader2, Settings } from 'lucide-react';

// Composants
import EditorToolbar from '../components/EditorToolbar';
import TagSelector from '../components/TagSelector';
import TagManager from '../components/TagManager';
import FolderSelector from '../components/FolderSelector';
import FolderManager from '../components/FolderManager';
import ConfirmModal from '../components/ConfirmModal'; // Import Modale

export default function Admin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const textareaRef = useRef(null);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Modales
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // État suppression

  // Données
  const [id, setId] = useState(null);
  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState('');
  const [tags, setTags] = useState([]);
  const [content, setContent] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login', { replace: true, state: { from: location } });
      setSession(session);
    });
    if (slug) loadPost();
  }, [slug, navigate, location]);

  const loadPost = async () => {
    setLoading(true);
    const { data } = await supabase.from('wiki_posts').select('*').eq('slug', slug).single();
    if (data) {
      setId(data.id);
      setTitle(data.title);
      setFolder(data.folder);
      setTags(data.tags || []);
      setContent(data.content);
    }
    setLoading(false);
  };

  const handleInsert = (before, after) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousText = textarea.value;
    const newText = previousText.substring(0, start) + before + previousText.substring(start, end) + after + previousText.substring(end);
    setContent(newText);
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + before.length, end + before.length); }, 0);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${Math.random()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('wiki_images').upload(filePath, file);
    if (uploadError) { alert('Erreur upload: ' + uploadError.message); } 
    else {
      const { data } = supabase.storage.from('wiki_images').getPublicUrl(filePath);
      handleInsert(`\n![Image](${data.publicUrl})\n`, '');
    }
    setUploading(false);
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        setUploading(true);
        const file = item.getAsFile();
        const fileExt = file.name.split('.').pop() || 'png';
        const filePath = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('wiki_images').upload(filePath, file);
        if (!uploadError) {
          const { data } = supabase.storage.from('wiki_images').getPublicUrl(filePath);
          handleInsert(`\n![Image collée](${data.publicUrl})\n`, '');
        }
        setUploading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!title) return alert("Titre requis");
    const newSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const postData = { title, slug: newSlug, folder, tags: tags, content, is_public: true };
    let error;
    if (id) { const { error: err } = await supabase.from('wiki_posts').update(postData).eq('id', id); error = err; } 
    else { const { error: err } = await supabase.from('wiki_posts').insert([postData]); error = err; }
    if (error) alert('Erreur: ' + error.message);
    else navigate(`/wiki/${newSlug}`);
  };

  // Suppression réelle déclenchée par la modale
  const performDelete = async () => {
    // 1. Suppression dans Supabase
    const { error } = await supabase.from('wiki_posts').delete().eq('id', id);
    
    if (!error) {
      // 2. NETTOYAGE DE L'HISTORIQUE LOCAL
      // On récupère l'historique actuel
      const history = JSON.parse(localStorage.getItem('wiki_history') || '[]');
      // On garde tout SAUF l'article qu'on vient de supprimer
      const newHistory = history.filter(h => h.id !== id);
      // On sauvegarde la liste propre
      localStorage.setItem('wiki_history', JSON.stringify(newHistory));

      // 3. Retour à l'accueil
      navigate('/');
    } else {
      alert("Erreur suppression : " + error.message);
    }
  };

  const handleTagDelete = (deletedTag) => {
    // On retire le tag de l'article actuel s'il est présent
    setTags(prevTags => prevTags.filter(t => t !== deletedTag));
  };

  const handleFolderRename = (oldName, newName) => { if (folder === oldName) setFolder(newName); };
  const handleTagRename = (oldTag, newTag) => { setTags(prevTags => prevTags.map(t => t === oldTag ? newTag : t)); };

  if (!session) return null;

  return (
    <div className="h-full flex flex-col p-6 max-w-7xl mx-auto font-sans animate-enter">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-wiki-surface rounded-lg text-wiki-muted"><ArrowLeft size={20} /></button>
          <h1 className="text-2xl font-bold text-wiki-text">{id ? 'Modifier l\'article' : 'Nouvel Article'}</h1>
        </div>
        
        <div className="flex gap-3">
          {id && (
            <button 
              onClick={() => setShowDeleteModal(true)} // Ouvre la modale
              className="p-2 text-red-500 hover:bg-red-900/20 rounded transition-colors" title="Supprimer"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button onClick={handleSave} className="flex items-center gap-2 bg-wiki-accent text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"><Save size={18} /> Sauvegarder</button>
        </div>
      </div>

      {loading ? ( <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-wiki-accent" /></div> ) : (
        <div className="flex-1 flex flex-col gap-6 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-wiki-surface/30 p-4 rounded-xl border border-wiki-border">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-wiki-muted mb-1 block">TITRE</label>
              <input className="w-full bg-wiki-bg border border-wiki-border rounded-lg p-2.5 text-wiki-text focus:border-wiki-accent outline-none transition-all" value={title} onChange={e => setTitle(e.target.value)} placeholder="ex: Guide Installation Docker" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1"><label className="text-xs font-bold text-wiki-muted block">DOSSIER</label><button onClick={() => setIsFolderManagerOpen(true)} className="text-[10px] flex items-center gap-1 text-wiki-accent hover:underline cursor-pointer bg-transparent border-none p-0"><Settings size={10} /> Gérer</button></div>
              <FolderSelector value={folder} onChange={setFolder} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1"><label className="text-xs font-bold text-wiki-muted block">TAGS</label><button onClick={() => setIsTagManagerOpen(true)} className="text-[10px] flex items-center gap-1 text-wiki-accent hover:underline cursor-pointer bg-transparent border-none p-0"><Settings size={10} /> Gérer</button></div>
              <TagSelector selectedTags={tags} onChange={setTags} title={title} content={content} />
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
            <div className="flex flex-col relative border border-wiki-border rounded-xl overflow-hidden bg-wiki-surface/50 focus-within:border-wiki-accent transition-colors">
              <div className="flex justify-between items-center bg-wiki-bg border-b border-wiki-border pr-2">
                 <EditorToolbar onInsert={handleInsert} />
                 <label className="cursor-pointer flex items-center gap-1 text-xs text-wiki-muted hover:text-wiki-accent px-2 transition-colors" title="Ajouter une image">
                    {uploading ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={18} />}
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                 </label>
              </div>
              <textarea ref={textareaRef} className="flex-1 w-full bg-transparent p-4 text-wiki-text font-mono text-sm focus:outline-none resize-none leading-relaxed custom-scrollbar" value={content} onChange={e => setContent(e.target.value)} onPaste={handlePaste} placeholder="# Commencez à écrire... (Glissez ou collez des images)" />
            </div>
            <div className="flex flex-col min-h-0 hidden lg:flex border border-wiki-border rounded-xl overflow-hidden bg-wiki-bg">
              <div className="bg-wiki-surface/30 px-4 py-2 border-b border-wiki-border text-xs font-bold text-wiki-muted">APERÇU EN DIRECT</div>
              <div className="flex-1 p-6 overflow-y-auto prose prose-invert prose-sm max-w-none custom-scrollbar">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      <TagManager isOpen={isTagManagerOpen} onClose={() => setIsTagManagerOpen(false)} onRename={handleTagRename} onDelete={handleTagDelete} />
      <FolderManager isOpen={isFolderManagerOpen} onClose={() => setIsFolderManagerOpen(false)} onRename={handleFolderRename} />
      
      {/* MODALE SUPPRESSION */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={performDelete}
        title="Supprimer l'article ?"
        message={`Êtes-vous sûr de vouloir supprimer "${title}" ? Cette action est irréversible.`}
        confirmText="Supprimer l'article"
      />
    </div>
  );
}