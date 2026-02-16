import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Save, Trash2, Image as ImageIcon, ArrowLeft, Loader2, Settings, History, RotateCcw, X, Eye, FileText, ChevronRight, LayoutTemplate, Globe, Sparkles, Wand2, CheckCheck } from 'lucide-react';
import TurndownService from 'turndown';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Readability } from '@mozilla/readability'; // <--- NOUVEAU IMPORT

// Composants & Utils
import EditorToolbar from '../components/EditorToolbar';
import TagSelector from '../components/TagSelector';
import TagManager from '../components/TagManager';
import FolderSelector from '../components/FolderSelector';
import FolderManager from '../components/FolderManager';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/ToastContext';
import { parseWikiLinks } from '../utils/wikiLinkParser';
import { TEMPLATES } from '../utils/templates';

import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function Admin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const textareaRef = useRef(null);
  const { addToast } = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState(null);

  const [id, setId] = useState(null);
  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState('general');
  const [tags, setTags] = useState([]);
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);

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

  useEffect(() => {
    if (!slug && !id) {
      const savedContent = localStorage.getItem('wiki_draft_content');
      const savedTitle = localStorage.getItem('wiki_draft_title');
      if (savedContent || savedTitle) {
         if (savedContent && content === '') setContent(savedContent);
         if (savedTitle && title === '') setTitle(savedTitle);
         addToast("Brouillon restauré", "info");
      }
    }
  }, [slug, id]);

  useEffect(() => {
    const saveDraft = () => {
      if (content.length > 5 || title.length > 2) {
        localStorage.setItem('wiki_draft_content', content);
        localStorage.setItem('wiki_draft_title', title);
      }
    };
    const timer = setInterval(saveDraft, 5000);
    return () => clearInterval(timer);
  }, [content, title]);

  const loadPost = async () => {
    setLoading(true);
    const { data } = await supabase.from('wiki_posts').select('*').eq('slug', slug).single();
    if (data) {
      setId(data.id);
      setTitle(data.title);
      setFolder(data.folder);
      setTags(data.tags || []);
      setContent(data.content);
      setIsPublic(data.is_public);
      setOriginalData(data);
    }
    setLoading(false);
  };

  const loadHistory = async () => {
    if (!id) return;
    setPreviewVersion(null);
    const { data } = await supabase.from('wiki_versions').select('*').eq('post_id', id).order('created_at', { ascending: false });
    if (data) {
      setVersions(data);
      if (data.length > 0) setPreviewVersion(data[0]);
    }
  };

  const handleInsert = (before, after) => {
    const textarea = textareaRef.current;
    if (!textarea) {
        setContent(prev => prev + before + after);
        return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousText = textarea.value;
    const newText = previousText.substring(0, start) + before + previousText.substring(start, end) + after + previousText.substring(end);
    setContent(newText);
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + before.length, end + before.length); }, 0);
  };

  // --- FONCTION D'IMPORT AMÉLIORÉE (READABILITY) ---
  const handleImportURL = async () => {
    const url = prompt("Entrez l'URL de l'article à importer :");
    if (!url) return;

    setImportLoading(true);
    try {
        // 1. Récupération via Proxy
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error("Impossible d'accéder à l'URL via le proxy.");
        const htmlText = await response.text();

        // 2. Parsing du HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        // 3. Correction des URLs relatives (Images et Liens)
        // Transforme "/img/logo.png" en "https://site.com/img/logo.png"
        const baseUrl = new URL(url);
        doc.querySelectorAll('img, a').forEach(el => {
            if (el.hasAttribute('src')) {
                try { el.src = new URL(el.getAttribute('src'), baseUrl).href; } catch(e){}
            }
            if (el.hasAttribute('href')) {
                try { el.href = new URL(el.getAttribute('href'), baseUrl).href; } catch(e){}
            }
        });

        // 4. Nettoyage Intelligent avec Mozilla Readability
        const reader = new Readability(doc);
        const article = reader.parse();

        if (!article) throw new Error("Impossible d'extraire le contenu principal.");

        // 5. Conversion en Markdown
        const turndownService = new TurndownService({ 
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            hr: '---'
        });

        // Supprime les tags indésirables que Readability aurait pu laisser
        turndownService.remove(['script', 'style', 'iframe', 'form', 'nav', 'footer']);

        let markdown = turndownService.turndown(article.content);

        // Ajout du titre original de l'article si le champ titre est vide
        if (!title && article.title) setTitle(article.title);

        const footer = `\n\n> **Source** : [${article.title || 'Lien'}](${url}) - *Importé le ${new Date().toLocaleDateString()}*`;
        
        handleInsert(markdown + footer, '');
        addToast("Article importé et nettoyé !", "success");

    } catch (error) {
        console.error(error);
        addToast("Erreur import : " + error.message, "error");
    }
    setImportLoading(false);
  };
  // ------------------------------------------------

  const runAI = async (mode) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return addToast("Clé manquante", "error");

    setAiLoading(true);
    try {
        let prompt = "";
        let currentText = content || "";

        if (mode === 'fix') {
            prompt = `Corrige ce texte (Markdown) sans changer le sens :\n\n${currentText}`;
        } else if (mode === 'generate') {
            if (!title) throw new Error("Titre manquant");
            prompt = `Rédige un article Markdown sur : "${title}"`;
        } else if (mode === 'continue') {
            prompt = `Continue ce texte (Markdown) :\n\n${currentText.slice(-2000)}`;
        }

        // URL STANDARD
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Erreur Google:", data);
            throw new Error(data.error?.message || "Erreur API");
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Réponse vide de l'IA");

        if (mode === 'fix' || mode === 'generate') setContent(text);
        else handleInsert(text, '');

        addToast("Succès !", "success");
        setShowAI(false);

    } catch (error) {
        addToast("Erreur : " + error.message, "error");
    }
    setAiLoading(false);
  };

  const processImageUpload = async (file) => {
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${Math.random()}.${fileExt}`;
    const { error } = await supabase.storage.from('wiki_images').upload(filePath, file);
    if (error) addToast('Erreur upload : ' + error.message, 'error');
    else {
      const { data } = supabase.storage.from('wiki_images').getPublicUrl(filePath);
      handleInsert(`\n![Image](${data.publicUrl})\n`, '');
      addToast('Image ajoutée !', 'success');
    }
    setUploading(false);
  };
  const handleImageUpload = (e) => { if(e.target.files[0]) processImageUpload(e.target.files[0]); };
  const handleDrop = (e) => { 
      e.preventDefault(); setIsDragging(false); 
      if(e.dataTransfer.files[0] && e.dataTransfer.files[0].type.startsWith('image/')) processImageUpload(e.dataTransfer.files[0]); 
  };

  const handleSave = async () => {
    if (!title) return addToast("Le titre est obligatoire", 'error');
    const newSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const postData = { title, slug: newSlug, folder, tags, content, is_public: isPublic };
    
    let error;
    if (id) { 
      if (originalData && (originalData.content !== content || originalData.title !== title)) {
        await supabase.from('wiki_versions').insert({ post_id: id, title: originalData.title, content: originalData.content });
      }
      const { error: err } = await supabase.from('wiki_posts').update(postData).eq('id', id); error = err; 
    } else { 
      const { error: err } = await supabase.from('wiki_posts').insert([postData]); error = err; 
    }
    
    if (error) addToast('Erreur sauvegarde : ' + error.message, 'error');
    else {
      localStorage.removeItem('wiki_draft_content'); localStorage.removeItem('wiki_draft_title');
      addToast(`Article ${isPublic ? 'publié' : 'sauvegardé'} !`, 'success');
      navigate(`/wiki/${newSlug}`);
    }
  };

  const performDelete = async () => {
    const { error } = await supabase.from('wiki_posts').delete().eq('id', id);
    if (!error) { navigate('/'); addToast('Supprimé', 'info'); }
  };

  const performRestore = () => {
    if (versionToRestore) { setTitle(versionToRestore.title); setContent(versionToRestore.content); setVersionToRestore(null); setShowHistoryModal(false); }
  };

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
              <button onClick={() => { loadHistory(); setShowHistoryModal(true); }} className="p-2 text-wiki-muted hover:text-wiki-accent hover:bg-wiki-surface rounded" title="Historique"><History size={18} /></button>
              <button onClick={() => setShowDeleteModal(true)} className="p-2 text-red-500 hover:bg-red-900/20 rounded" title="Supprimer"><Trash2 size={18} /></button>
              <div className="h-6 w-px bg-wiki-border mx-1"></div>
            </>
          )}

          <label className="flex items-center gap-2 cursor-pointer bg-wiki-surface border border-wiki-border px-3 py-2 rounded-lg select-none hover:border-wiki-accent transition-colors">
            <input type="checkbox" className="hidden" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
            <div className={`w-3 h-3 rounded-full transition-all ${isPublic ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-orange-500'}`} />
            <span className={`text-xs font-bold ${isPublic ? 'text-green-400' : 'text-orange-400'}`}>{isPublic ? 'PUBLIÉ' : 'BROUILLON'}</span>
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
                 
                 <div className="flex items-center gap-1">
                    <button onClick={handleImportURL} className="p-1.5 text-wiki-muted hover:text-blue-400 transition-colors rounded hover:bg-wiki-surface" title="Importer depuis une URL">
                        {importLoading ? <Loader2 size={18} className="animate-spin text-blue-400"/> : <Globe size={18} />}
                    </button>

                    <div className="relative">
                        <button onClick={() => setShowAI(!showAI)} className={`p-1.5 transition-colors rounded hover:bg-wiki-surface ${showAI ? 'text-purple-400 bg-purple-500/10' : 'text-wiki-muted hover:text-purple-400'}`} title="Assistant IA">
                            {aiLoading ? <Loader2 size={18} className="animate-spin text-purple-400"/> : <Sparkles size={18} />}
                        </button>
                        {showAI && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-wiki-surface border border-wiki-border rounded-xl shadow-xl z-20 overflow-hidden animate-enter">
                                <div className="p-2 bg-purple-900/20 border-b border-wiki-border text-xs font-bold text-purple-300 flex items-center gap-2">
                                    <Sparkles size={12}/> ASSISTANT IA
                                </div>
                                <button onClick={() => runAI('generate')} className="w-full text-left px-4 py-3 hover:bg-wiki-accent/10 hover:text-wiki-accent transition-colors flex items-center gap-3 text-sm border-b border-wiki-border/50">
                                    <Wand2 size={16} className="text-purple-400"/> <span>Générer l'article (via Titre)</span>
                                </button>
                                <button onClick={() => runAI('continue')} className="w-full text-left px-4 py-3 hover:bg-wiki-accent/10 hover:text-wiki-accent transition-colors flex items-center gap-3 text-sm border-b border-wiki-border/50">
                                    <FileText size={16} className="text-blue-400"/> <span>Continuer la rédaction</span>
                                </button>
                                <button onClick={() => runAI('fix')} className="w-full text-left px-4 py-3 hover:bg-wiki-accent/10 hover:text-wiki-accent transition-colors flex items-center gap-3 text-sm">
                                    <CheckCheck size={16} className="text-green-400"/> <span>Corriger Orthographe</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-wiki-border mx-1"></div>

                    <div className="relative">
                      <button onClick={() => setShowTemplates(!showTemplates)} className="p-1.5 text-wiki-muted hover:text-wiki-accent transition-colors rounded hover:bg-wiki-surface" title="Modèles">
                        <LayoutTemplate size={18} />
                      </button>
                      {showTemplates && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-wiki-surface border border-wiki-border rounded-xl shadow-xl z-20 overflow-hidden animate-enter">
                          <div className="p-2 bg-wiki-bg border-b border-wiki-border text-xs font-bold text-wiki-muted">MODÈLES</div>
                          {TEMPLATES.map(t => (
                            <button key={t.id} onClick={() => { setContent(prev => prev ? prev + '\n\n' + t.content : t.content); setShowTemplates(false); }} className="w-full text-left px-4 py-3 hover:bg-wiki-accent/10 hover:text-wiki-accent transition-colors flex items-center gap-3 text-sm border-b border-wiki-border/50 last:border-0">
                              <span className="text-lg">{t.icon}</span><span className="font-medium">{t.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <label className="cursor-pointer flex items-center gap-1 text-xs text-wiki-muted hover:text-wiki-accent px-2 transition-colors p-1.5 rounded hover:bg-wiki-surface" title="Ajouter image">
                        {uploading ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={18} />}
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                 </div>
              </div>
              
              <textarea 
                ref={textareaRef} 
                className={`flex-1 w-full bg-transparent p-4 text-wiki-text font-mono text-sm focus:outline-none resize-none leading-relaxed custom-scrollbar transition-all ${isDragging ? 'bg-wiki-accent/10 border-2 border-dashed border-wiki-accent' : ''}`} 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                onDragOver={e => {e.preventDefault(); setIsDragging(true);}}
                onDragLeave={e => {e.preventDefault(); setIsDragging(false);}}
                onDrop={handleDrop}
                placeholder={isDragging ? "Lâchez l'image ici..." : "# Commencez à écrire..."} 
              />
            </div>

            <div className="flex flex-col min-h-0 hidden lg:flex border border-wiki-border rounded-xl overflow-hidden bg-wiki-bg">
              <div className="bg-wiki-surface/30 px-4 py-2 border-b border-wiki-border text-xs font-bold text-wiki-muted">APERÇU</div>
              <div className="flex-1 p-6 overflow-y-auto prose prose-invert prose-sm max-w-none custom-scrollbar">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{parseWikiLinks(content)}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      <TagManager isOpen={isTagManagerOpen} onClose={() => setIsTagManagerOpen(false)} onRename={(o, n) => setTags(t => t.map(tag => tag === o ? n : tag))} onDelete={(d) => setTags(t => t.filter(tag => tag !== d))} />
      <FolderManager isOpen={isFolderManagerOpen} onClose={() => setIsFolderManagerOpen(false)} onRename={(o, n) => { if(folder === o) setFolder(n); }} />
      <ConfirmModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={performDelete} title="Supprimer ?" message="Irréversible." confirmText="Supprimer" isDanger={true} />
      <ConfirmModal isOpen={!!versionToRestore} onClose={() => setVersionToRestore(null)} onConfirm={performRestore} title="Restaurer ?" message="Écrase le contenu actuel." confirmText="Restaurer" />

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-enter" onClick={() => setShowHistoryModal(false)}>
          <div className="bg-wiki-surface border border-wiki-border rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-wiki-border flex justify-between items-center bg-wiki-bg">
              <div><h3 className="font-bold text-wiki-text flex items-center gap-2"><History size={18}/> Historique</h3></div>
              <button onClick={() => setShowHistoryModal(false)} className="text-wiki-muted hover:text-white"><X size={20}/></button>
            </div>
            <div className="flex flex-1 min-h-0">
              <div className="w-1/3 border-r border-wiki-border overflow-y-auto custom-scrollbar bg-wiki-surface/30">
                {versions.map(v => (
                  <button key={v.id} onClick={() => setPreviewVersion(v)} className={`w-full text-left p-4 border-b border-wiki-border/50 ${previewVersion?.id === v.id ? 'bg-wiki-accent/10 border-l-4 border-l-wiki-accent' : 'hover:bg-wiki-bg'}`}>
                    <div className="font-bold text-sm text-wiki-text truncate">{v.title}</div>
                    <div className="text-xs text-wiki-muted">{new Date(v.created_at).toLocaleString()}</div>
                  </button>
                ))}
              </div>
              <div className="flex-1 flex flex-col min-h-0 bg-wiki-bg">
                {previewVersion ? (
                  <>
                    <div className="p-4 border-b border-wiki-border flex justify-between items-center bg-wiki-surface/20">
                      <div className="text-sm text-wiki-muted">Version du <span className="text-wiki-text font-bold">{new Date(previewVersion.created_at).toLocaleString()}</span></div>
                      <button onClick={performRestore} className="px-4 py-2 bg-wiki-accent text-white text-sm font-bold rounded-lg flex items-center gap-2"><RotateCcw size={16} /> Restaurer</button>
                    </div>
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar prose prose-invert max-w-none"><h1>{previewVersion.title}</h1><ReactMarkdown>{previewVersion.content}</ReactMarkdown></div>
                  </>
                ) : <div className="flex-1 flex items-center justify-center text-wiki-muted">Sélectionnez une version</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}