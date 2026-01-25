import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Save, Trash2, Image as ImageIcon, ArrowLeft, Loader2, Settings, History, RotateCcw, X, Eye, FileText, ChevronRight } from 'lucide-react';

// Composants
import EditorToolbar from '../components/EditorToolbar';
import TagSelector from '../components/TagSelector';
import TagManager from '../components/TagManager';
import FolderSelector from '../components/FolderSelector';
import FolderManager from '../components/FolderManager';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/ToastContext';

export default function Admin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const textareaRef = useRef(null);
  const { addToast } = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Modales
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Confirmation Restauration
  const [versionToRestore, setVersionToRestore] = useState(null);

  // Données Article
  const [id, setId] = useState(null);
  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState('general');
  const [tags, setTags] = useState([]);
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(true); // <--- NOUVEAU : ÉTAT PUBLIC/BROUILLON

  // Données Historique
  const [originalData, setOriginalData] = useState(null); 
  const [versions, setVersions] = useState([]);
  const [previewVersion, setPreviewVersion] = useState(null);

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
      setIsPublic(data.is_public); // <--- CHARGER L'ÉTAT
      setOriginalData(data);
    }
    setLoading(false);
  };

  const loadHistory = async () => {
    if (!id) return;
    setPreviewVersion(null);
    const { data } = await supabase
      .from('wiki_versions')
      .select('*')
      .eq('post_id', id)
      .order('created_at', { ascending: false });
    
    if (data) {
      setVersions(data);
      if (data.length > 0) setPreviewVersion(data[0]);
    }
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
    
    if (uploadError) { 
      addToast('Erreur upload : ' + uploadError.message, 'error'); 
    } else {
      const { data } = supabase.storage.from('wiki_images').getPublicUrl(filePath);
      handleInsert(`\n![Image](${data.publicUrl})\n`, '');
      addToast('Image uploadée !', 'success');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!title) return addToast("Le titre est obligatoire", 'error');
    
    const newSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // ON SAUVEGARDE L'ÉTAT 'is_public' ICI
    const postData = { title, slug: newSlug, folder, tags: tags, content, is_public: isPublic };
    
    let error;

    if (id) { 
      if (originalData && (originalData.content !== content || originalData.title !== title)) {
        await supabase.from('wiki_versions').insert({
          post_id: id,
          title: originalData.title,
          content: originalData.content
        });
      }
      const { error: err } = await supabase.from('wiki_posts').update(postData).eq('id', id); 
      error = err; 
    } else { 
      const { error: err } = await supabase.from('wiki_posts').insert([postData]); 
      error = err; 
    }
    
    if (error) {
      addToast('Erreur sauvegarde : ' + error.message, 'error');
    } else {
      addToast(`Article ${isPublic ? 'publié' : 'sauvegardé en brouillon'} !`, 'success');
      navigate(`/wiki/${newSlug}`);
    }
  };

  const performDelete = async () => {
    const { error } = await supabase.from('wiki_posts').delete().eq('id', id);
    if (!error) {
      const history = JSON.parse(localStorage.getItem('wiki_history') || '[]');
      localStorage.setItem('wiki_history', JSON.stringify(history.filter(h => h.id !== id)));
      addToast('Article supprimé', 'info');
      navigate('/');
    } else {
      addToast("Erreur suppression : " + error.message, 'error');
    }
  };

  const requestRestore = (version) => { setVersionToRestore(version); };

  const performRestore = () => {
    if (versionToRestore) {
      setTitle(versionToRestore.title);
      setContent(versionToRestore.content);
      setVersionToRestore(null);
      setShowHistoryModal(false);
      addToast("Version restaurée (Pensez à sauvegarder)", 'success');
    }
  };

  const handleFolderRename = (oldName, newName) => { if (folder === oldName) setFolder(newName); };
  const handleTagRename = (oldTag, newTag) => { setTags(prevTags => prevTags.map(t => t === oldTag ? newTag : t)); };
  const handleTagDelete = (deletedTag) => { setTags(prevTags => prevTags.filter(t => t !== deletedTag)); };

  if (!session) return null;

  return (
    <div className="h-full flex flex-col p-6 max-w-7xl mx-auto font-sans animate-enter">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-wiki-surface rounded-lg text-wiki-muted"><ArrowLeft size={20} /></button>
          <h1 className="text-2xl font-bold text-wiki-text">{id ? 'Modifier l\'article' : 'Nouvel Article'}</h1>
        </div>
        
        <div className="flex gap-3 items-center">
          {id && (
            <>
              <button onClick={() => { loadHistory(); setShowHistoryModal(true); }} className="p-2 text-wiki-muted hover:text-wiki-accent hover:bg-wiki-surface rounded transition-colors" title="Historique des versions"><History size={18} /></button>
              <button onClick={() => setShowDeleteModal(true)} className="p-2 text-red-500 hover:bg-red-900/20 rounded transition-colors" title="Supprimer"><Trash2 size={18} /></button>
              <div className="h-6 w-px bg-wiki-border mx-1"></div>
            </>
          )}

          {/* SWITCH BROUILLON / PUBLIÉ */}
          <label className="flex items-center gap-2 cursor-pointer bg-wiki-surface border border-wiki-border px-3 py-2 rounded-lg select-none hover:border-wiki-accent transition-colors">
            <input type="checkbox" className="hidden" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
            <div className={`w-3 h-3 rounded-full transition-all ${isPublic ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-orange-500'}`} />
            <span className={`text-xs font-bold transition-colors ${isPublic ? 'text-green-400' : 'text-orange-400'}`}>
              {isPublic ? 'PUBLIÉ' : 'BROUILLON'}
            </span>
          </label>

          <button onClick={handleSave} className="flex items-center gap-2 bg-wiki-accent text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"><Save size={18} /> Sauvegarder</button>
        </div>
      </div>

      {loading ? ( <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-wiki-accent" /></div> ) : (
        <div className="flex-1 flex flex-col gap-6 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-wiki-surface/30 p-4 rounded-xl border border-wiki-border">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-wiki-muted mb-1 block">TITRE</label>
              <input className="w-full bg-wiki-bg border border-wiki-border rounded-lg p-2.5 text-wiki-text focus:border-wiki-accent outline-none transition-all" value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de l'article" />
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
                 <label className="cursor-pointer flex items-center gap-1 text-xs text-wiki-muted hover:text-wiki-accent px-2 transition-colors">
                    {uploading ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={18} />}
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                 </label>
              </div>
              <textarea ref={textareaRef} className="flex-1 w-full bg-transparent p-4 text-wiki-text font-mono text-sm focus:outline-none resize-none leading-relaxed custom-scrollbar" value={content} onChange={e => setContent(e.target.value)} placeholder="# Contenu..." />
            </div>
            <div className="flex flex-col min-h-0 hidden lg:flex border border-wiki-border rounded-xl overflow-hidden bg-wiki-bg">
              <div className="bg-wiki-surface/30 px-4 py-2 border-b border-wiki-border text-xs font-bold text-wiki-muted">APERÇU</div>
              <div className="flex-1 p-6 overflow-y-auto prose prose-invert prose-sm max-w-none custom-scrollbar">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALES ANNEXES ET CONFIRMATION */}
      <TagManager isOpen={isTagManagerOpen} onClose={() => setIsTagManagerOpen(false)} onRename={handleTagRename} onDelete={handleTagDelete} />
      <FolderManager isOpen={isFolderManagerOpen} onClose={() => setIsFolderManagerOpen(false)} onRename={handleFolderRename} />
      <ConfirmModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={performDelete} title="Supprimer ?" message="Irréversible." confirmText="Supprimer" isDanger={true} />
      
      <ConfirmModal 
        isOpen={!!versionToRestore}
        onClose={() => setVersionToRestore(null)}
        onConfirm={performRestore}
        title="Restaurer cette version ?"
        message="Le contenu actuel de l'éditeur sera remplacé. Les modifications non sauvegardées seront perdues."
        confirmText="Oui, restaurer"
      />

      {/* MODALE HISTORIQUE SPLIT VIEW */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-enter" onClick={() => setShowHistoryModal(false)}>
          <div className="bg-wiki-surface border border-wiki-border rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-wiki-border flex justify-between items-center bg-wiki-bg">
              <div>
                <h3 className="font-bold text-wiki-text flex items-center gap-2"><History size={18}/> Historique des versions</h3>
                <p className="text-xs text-wiki-muted mt-1">Sélectionnez une version pour prévisualiser.</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-wiki-muted hover:text-white"><X size={20}/></button>
            </div>
            <div className="flex flex-1 min-h-0">
              {/* LISTE */}
              <div className="w-1/3 border-r border-wiki-border overflow-y-auto custom-scrollbar bg-wiki-surface/30">
                {versions.length === 0 ? (<div className="p-8 text-center text-wiki-muted text-sm italic">Aucune archive.</div>) : (
                  versions.map(v => (
                    <button key={v.id} onClick={() => setPreviewVersion(v)} className={`w-full text-left p-4 border-b border-wiki-border/50 transition-colors flex flex-col gap-1 ${previewVersion?.id === v.id ? 'bg-wiki-accent/10 border-l-4 border-l-wiki-accent' : 'hover:bg-wiki-bg border-l-4 border-l-transparent'}`}>
                      <div className="font-bold text-sm text-wiki-text truncate">{v.title}</div>
                      <div className="flex justify-between items-center"><span className="text-xs text-wiki-muted">{new Date(v.created_at).toLocaleString()}</span>{previewVersion?.id === v.id && <ChevronRight size={14} className="text-wiki-accent"/>}</div>
                    </button>
                  ))
                )}
              </div>
              {/* PREVIEW */}
              <div className="flex-1 flex flex-col min-h-0 bg-wiki-bg">
                {previewVersion ? (
                  <>
                    <div className="p-4 border-b border-wiki-border flex justify-between items-center bg-wiki-surface/20">
                      <div className="flex items-center gap-2 text-sm text-wiki-muted"><FileText size={16} /> Aperçu de <span className="text-wiki-text font-bold">{new Date(previewVersion.created_at).toLocaleString()}</span></div>
                      <button onClick={() => requestRestore(previewVersion)} className="px-4 py-2 bg-wiki-accent text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-colors flex items-center gap-2"><RotateCcw size={16} /> Restaurer</button>
                    </div>
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar prose prose-invert max-w-none">
                      <h1>{previewVersion.title}</h1>
                      <ReactMarkdown>{previewVersion.content}</ReactMarkdown>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-wiki-muted"><Eye size={48} className="mb-4 opacity-20"/><p>Sélectionnez une version à gauche.</p></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}