import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ReactMarkdown from 'react-markdown';
import { 
  Calendar, Clock, Folder, Edit, Eye, 
  Printer, MessageSquare, Send, X, Bot, Loader2, 
  Star, StopCircle, Eraser, Sparkles
} from 'lucide-react';

// Composants existants
import CodeBlock from '../components/CodeBlock';
import TableOfContents from '../components/TableOfContents';
import CommentsSection from '../components/CommentsSection';
import { useToast } from '../components/ToastContext';
import Mermaid from '../components/Mermaid';
import { ArticleSkeleton } from '../components/SkeletonLoader';
import Backlinks from '../components/Backlinks';
import { parseWikiLinks } from '../utils/wikiLinkParser';

// Support Maths
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import rehypeSlug from 'rehype-slug';

export default function WikiPage({ session, isAdmin, myFavorites, onToggleFavorite, onTagClick }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  // États de l'article
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [readingTime, setReadingTime] = useState(1);
  const viewedRef = useRef('');

  // --- ÉTATS DU CHAT AVANCÉ ---
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]); 
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef(null); 
  const chatEndRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // --- 1. CHARGEMENT ET LOGIQUE ---
  useEffect(() => {
    fetchPostData();
    setMessages([{ 
        id: 'welcome', 
        role: 'model', 
        content: "Bonjour ! Je suis l'IA de cet article. Posez-moi une question, je répondrai en utilisant le contenu ci-contre." 
    }]);
    
    const mainContainer = document.getElementById('main-content');
    const handleScroll = () => {
      if (!mainContainer) return;
      const { scrollTop, scrollHeight, clientHeight } = mainContainer;
      setScrollProgress((scrollTop / (scrollHeight - clientHeight)) * 100);
    };

    if (mainContainer) {
      mainContainer.addEventListener('scroll', handleScroll);
      mainContainer.scrollTop = 0;
    }
    return () => mainContainer?.removeEventListener('scroll', handleScroll);
  }, [slug]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showChat]);

  const fetchPostData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('wiki_posts').select('*').eq('slug', slug).single();
    
    if (error || !data) {
      setLoading(false);
      return; 
    }

    setPost(data);
    setReadingTime(Math.ceil(data.content.split(/\s+/).length / 200));

    if (viewedRef.current !== data.slug) {
        await supabase.rpc('increment_views', { post_id: data.id });
        viewedRef.current = data.slug;
    }

    try {
        const history = JSON.parse(localStorage.getItem('wiki_history') || '[]');
        if (!history.find(h => h.id === data.id)) {
            const newHistory = [{ id: data.id, title: data.title, slug: data.slug, folder: data.folder }, ...history].slice(0, 10);
            localStorage.setItem('wiki_history', JSON.stringify(newHistory));
        }
    } catch (e) { console.error(e); }

    setLoading(false);
  };

  const handlePrint = () => window.print();

  // --- 2. LE MOTEUR IA (STREAMING OPTIMISÉ) ---
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userText = input;
    setInput('');
    setIsStreaming(true);

    const newHistory = [...messages, { id: Date.now(), role: 'user', content: userText }];
    setMessages(newHistory);

    const aiMessageId = Date.now() + 1;
    setMessages(prev => [...prev, { id: aiMessageId, role: 'model', content: '' }]);

    // === PROMPT STRICT POUR LA MISE EN FORME ===
    const systemInstruction = {
        role: "user",
        parts: [{ text: `Tu es un assistant expert et pédagogue. Réponds en te basant EXCLUSIVEMENT sur l'article ci-dessous.
        
        RÈGLES DE MISE EN FORME OBLIGATOIRES :
        1. AÈRE AU MAXIMUM ta réponse.
        2. Utilise des listes à puces (- ) pour énumérer.
        3. Fais des sauts de ligne doubles entre chaque idée principale.
        4. Mets en **gras** les termes techniques importants.
        5. Sois concis mais structuré (Intro -> Points clés -> Conclusion).
        
        --- DÉBUT ARTICLE ---
        Titre : ${post.title}
        Contenu : ${post.content}
        --- FIN ARTICLE ---` }]
    };

    const apiHistory = newHistory
        .filter(m => m.id !== 'welcome') 
        .map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

    const contents = [systemInstruction, ...apiHistory];

    abortControllerRef.current = new AbortController();
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents }),
                signal: abortControllerRef.current.signal
            }
        );

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiText = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // REGEX OPTIMISÉE
            const regex = /"text":\s*"((?:[^"\\]|\\.)*)"/g;
            let match;
            let lastIndex = 0;
            let foundNewText = false;

            // On boucle sur toutes les correspondances dans le buffer actuel
            while ((match = regex.exec(buffer)) !== null) {
                let textFragment = match[1];
                textFragment = textFragment
                    .replace(/\\n/g, '\n')
                    .replace(/\\"/g, '"')
                    .replace(/\\r/g, '');

                aiText += textFragment;
                lastIndex = regex.lastIndex; // On garde la position de la fin du match
                foundNewText = true;
            }

            // NETTOYAGE CRITIQUE DU BUFFER (Empêche le bégaiement)
            if (lastIndex > 0) {
                buffer = buffer.substring(lastIndex);
            }

            // MISE À JOUR UI (Une seule fois par chunk pour la fluidité)
            if (foundNewText) {
                setMessages(prev => prev.map(m => 
                    m.id === aiMessageId ? { ...m, content: aiText } : m
                ));
            }
        }

    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error(error);
            setMessages(prev => [...prev, { id: Date.now(), role: 'model', content: "⚠️ Erreur IA. Réessayez." }]);
        }
    } finally {
        setIsStreaming(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsStreaming(false);
    }
  };

  const handleClearChat = () => {
      setMessages([{ id: 'welcome', role: 'model', content: "Mémoire effacée." }]);
  };

  const isFavorite = post && myFavorites.includes(post.id);

  if (loading) return <ArticleSkeleton />;
  if (!post) return <div className="p-10 text-center text-red-400">Article introuvable.</div>;

  return (
    <div className="relative min-h-full">
      
      {/* 1. BARRE DE PROGRESSION */}
      <div className="sticky top-0 left-0 w-full h-1 z-40 bg-transparent print:hidden">
        <div className="h-full bg-wiki-accent shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-100 ease-out" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* 2. CONTENU PRINCIPAL */}
      <div className="max-w-7xl mx-auto p-6 md:p-10 animate-enter pb-20 print:p-0 print:pb-0">
        
        {/* HEADER */}
        <div className="mb-8 pb-6 border-b border-wiki-border print:border-black">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                <div className="w-full">
                    {!post.is_public && <div className="mb-2 bg-orange-500/10 text-orange-400 px-3 py-1 rounded text-xs font-bold w-fit border border-orange-500/30 print:hidden">BROUILLON</div>}
                    <div className="flex items-center gap-2 text-sm text-wiki-accent mb-2 font-mono bg-wiki-accent/10 w-fit px-2 py-1 rounded print:text-black print:bg-transparent print:p-0 print:mb-0"><Folder size={12}/> {post.folder}</div>
                    <h1 className="text-3xl md:text-5xl font-bold text-wiki-text tracking-tight print:text-black">{post.title}</h1>
                </div>

                <div className="flex gap-2 shrink-0 print:hidden">
                    <button onClick={handlePrint} className="p-2 bg-wiki-surface border border-wiki-border rounded hover:bg-wiki-accent hover:text-white transition-colors" title="Imprimer / PDF"><Printer size={18} /></button>
                    <button onClick={() => session ? onToggleFavorite(post.id) : navigate('/login')} className={`p-2 border rounded transition-colors ${isFavorite ? 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10' : 'text-wiki-muted border-wiki-border bg-wiki-surface hover:text-wiki-text'}`} title="Favoris"><Star size={18} fill={isFavorite ? "currentColor" : "none"} /></button>
                    {isAdmin && <button onClick={() => navigate(`/admin/${post.slug}`)} className="p-2 bg-wiki-surface border border-wiki-border rounded hover:bg-wiki-accent hover:text-white transition-colors text-wiki-muted"><Edit size={18} /></button>}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-wiki-muted font-mono print:text-gray-600">
                <div className="flex items-center gap-1"><Calendar size={12}/> {new Date(post.created_at).toLocaleDateString()}</div>
                <div className="flex items-center gap-1 font-bold text-wiki-text print:text-black"><Clock size={12} className="text-wiki-accent print:text-black"/> {readingTime} min</div>
                <div className="flex items-center gap-1 print:hidden"><Eye size={12}/> {post.views || 0} vues</div>
                <div className="print:hidden flex gap-2">
                  {post.tags?.map(tag => (<button key={tag} onClick={() => onTagClick && onTagClick(tag)} className="bg-wiki-surface border border-wiki-border px-2 py-0.5 rounded hover:text-wiki-accent hover:border-wiki-accent transition-colors">#{tag}</button>))}
                </div>
            </div>
        </div>

        {/* CONTENU ARTICLE */}
        <div className="flex flex-col lg:flex-row gap-10">
            <div className="flex-1 min-w-0 prose prose-invert prose-slate max-w-none 
                prose-headings:font-bold prose-h1:text-3xl prose-p:text-wiki-muted prose-p:leading-relaxed 
                prose-code:text-wiki-accent prose-code:bg-wiki-surface prose-code:px-1 prose-code:py-0.5 prose-code:rounded 
                prose-pre:bg-transparent prose-pre:p-0 prose-pre:border-none 
                prose-img:rounded-xl prose-img:border prose-img:border-wiki-border
                print:prose-headings:text-black print:prose-p:text-black print:prose-strong:text-black
                print:prose-code:text-black print:prose-code:bg-gray-100 print:prose-code:border print:prose-code:border-gray-300
            ">
                <ReactMarkdown
                    rehypePlugins={[rehypeSlug, rehypeKatex]}
                    remarkPlugins={[remarkMath]}
                    components={{
                        code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            if (!inline && match && match[1] === 'mermaid') return <Mermaid chart={String(children)} />;
                            return !inline && match ? <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} /> : <code className={className} {...props}>{children}</code>;
                        }
                    }}
                >
                    {parseWikiLinks(post.content)}
                </ReactMarkdown>
            </div>
            <div className="hidden lg:block w-64 shrink-0 print:hidden">
                <div className="sticky top-4"><TableOfContents content={post.content} /></div>
            </div>
        </div>

        <div className="mt-16 border-t border-wiki-border pt-8 space-y-10 print:hidden">
            <Backlinks currentSlug={post.slug} currentTitle={post.title} />
            <CommentsSection postId={post.id} session={session} isAdmin={isAdmin} />
        </div>

      </div> 

      {/* 3. CHAT FLOTTANT AVANCÉ (CSS AÉRÉ) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none print:hidden">
          {showChat && (
              <div className="mb-4 w-80 md:w-96 bg-wiki-surface border border-wiki-border rounded-xl shadow-2xl overflow-hidden pointer-events-auto animate-enter flex flex-col max-h-[600px]">
                  
                  <div className="p-3 bg-wiki-bg border-b border-wiki-border flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-2 font-bold text-wiki-text text-sm">
                          <Bot size={16} className={`text-purple-400 ${isStreaming ? 'animate-pulse' : ''}`}/> 
                          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                            {isStreaming ? 'Réflexion...' : 'Assistant Wiki'}
                          </span>
                      </div>
                      <div className="flex items-center gap-1">
                          <button onClick={handleClearChat} className="p-1 text-wiki-muted hover:text-red-400" title="Effacer mémoire"><Eraser size={14}/></button>
                          <button onClick={() => setShowChat(false)} className="p-1 text-wiki-muted hover:text-white"><X size={16}/></button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-wiki-bg/95 backdrop-blur custom-scrollbar h-80">
                      {messages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[90%] rounded-2xl p-3 text-xs md:text-sm shadow-sm ${
                                  msg.role === 'user' 
                                  ? 'bg-wiki-accent text-white rounded-br-none' 
                                  : 'bg-wiki-surface border border-wiki-border text-wiki-text rounded-bl-none prose prose-invert prose-sm prose-p:mb-3 prose-p:leading-relaxed prose-ul:my-2 prose-li:mb-2 prose-strong:text-wiki-accent'
                                  /* ^^^ CSS MAGIQUE ICI : prose-p:mb-3 pour l'aération ^^^ */
                              }`}>
                                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                          </div>
                      ))}
                      {isStreaming && messages[messages.length - 1]?.content === '' && (
                          <div className="flex justify-start"><Loader2 size={16} className="animate-spin text-wiki-muted"/></div>
                      )}
                      <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleSend} className="p-3 bg-wiki-surface border-t border-wiki-border flex gap-2 items-center">
                      <input 
                        className="flex-1 bg-wiki-bg border border-wiki-border rounded-lg px-3 py-2 text-sm text-wiki-text focus:border-wiki-accent outline-none transition-colors placeholder:text-wiki-muted/50"
                        placeholder="Posez une question..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        disabled={isStreaming}
                        autoFocus
                      />
                      {isStreaming ? (
                          <button type="button" onClick={handleStop} className="p-2 bg-red-500/10 text-red-500 border border-red-500/50 rounded-lg hover:bg-red-500 hover:text-white transition-colors" title="Arrêter">
                              <StopCircle size={18} />
                          </button>
                      ) : (
                          <button type="submit" disabled={!input.trim()} className="p-2 bg-wiki-accent text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20">
                              <Send size={18} />
                          </button>
                      )}
                  </form>
              </div>
          )}
          <button onClick={() => setShowChat(!showChat)} className="pointer-events-auto w-14 h-14 bg-wiki-accent text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center hover:scale-110 transition-transform hover:bg-blue-500 border border-white/10 group" title="Discuter avec l'article">
              {showChat ? <X size={24} /> : <Sparkles size={24} className="group-hover:animate-spin-slow" />}
          </button>
      </div>

    </div>
  );
}