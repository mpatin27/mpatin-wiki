import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Send, Trash2, MessageSquare, User, Loader2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal'; // Import du composant

export default function CommentsSection({ postId, session, isAdmin }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // État pour savoir quel commentaire on veut supprimer
  const [commentToDelete, setCommentToDelete] = useState(null); 

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(username, role)') 
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) console.error("Erreur chargement:", error);
      else setComments(data || []);
    } catch (err) {
      console.error("Exception:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    const channel = supabase.channel(`comments_room:${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, 
        () => fetchComments()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !session) return;
    setSending(true);

    const { error } = await supabase.from('comments').insert({
      content: newComment,
      post_id: postId,
      user_id: session.user.id
    });

    if (error) {
      alert("Erreur envoi: " + error.message);
    } else {
      setNewComment('');
      await fetchComments(); 
    }
    setSending(false);
  };

  // 1. On demande la suppression -> Ouvre la modale
  const requestDelete = (commentId) => {
    setCommentToDelete(commentId);
  };

  // 2. On confirme la suppression (appelé par la modale)
  const confirmDelete = async () => {
    if (!commentToDelete) return;
    
    // UI Optimiste
    setComments(prev => prev.filter(c => c.id !== commentToDelete));
    
    const { error } = await supabase.from('comments').delete().eq('id', commentToDelete);
    if (error) {
      alert("Erreur suppression: " + error.message);
      fetchComments();
    }
    setCommentToDelete(null);
  };

  const formatDate = (date) => new Date(date).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' });

  return (
    <div className="mt-12 pt-8 border-t border-wiki-border animate-enter">
      <h3 className="text-xl font-bold text-wiki-text flex items-center gap-2 mb-6">
        <MessageSquare className="text-wiki-accent" /> Discussions <span className="text-sm text-wiki-muted font-normal">({comments.length})</span>
      </h3>

      <div className="space-y-6 mb-8">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-wiki-muted"/></div>
        ) : comments.length === 0 ? (
          <div className="text-wiki-muted text-sm italic bg-wiki-surface/30 p-4 rounded-lg border border-wiki-border border-dashed text-center">
            Aucun commentaire. Soyez le premier à réagir !
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex gap-3 group">
              <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold uppercase text-xs border ${comment.profiles?.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-wiki-surface text-wiki-muted border-wiki-border'}`}>
                {comment.profiles?.username?.[0] || <User size={12}/>}
              </div>
              
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${comment.profiles?.role === 'admin' ? 'text-purple-400' : 'text-wiki-text'}`}>
                      {comment.profiles?.username || 'Inconnu'}
                    </span>
                    {comment.profiles?.role === 'admin' && <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 px-1 rounded text-purple-400 font-bold">ADMIN</span>}
                    <span className="text-xs text-wiki-muted">{formatDate(comment.created_at)}</span>
                  </div>
                  
                  {(isAdmin || (session && session.user.id === comment.user_id)) && (
                    <button 
                      onClick={() => requestDelete(comment.id)} // Déclenche la modale
                      className="text-wiki-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1" 
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="text-sm text-wiki-text/90 mt-1 leading-relaxed whitespace-pre-wrap bg-wiki-surface/20 rounded-lg p-3 border border-transparent hover:border-wiki-border/50 transition-colors">
                  {comment.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {session ? (
        <form onSubmit={handleSubmit} className="flex gap-3 items-start">
          <div className="w-8 h-8 rounded-full bg-wiki-accent/20 flex items-center justify-center text-wiki-accent shrink-0 font-bold uppercase text-xs mt-1 border border-wiki-accent/30">Moi</div>
          <div className="flex-1 relative group">
            <textarea 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
              className="w-full bg-wiki-surface border border-wiki-border rounded-xl p-3 pr-12 text-sm text-wiki-text outline-none focus:border-wiki-accent focus:ring-1 focus:ring-wiki-accent/50 transition-all min-h-[50px] resize-y custom-scrollbar"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
            />
            <button disabled={sending || !newComment.trim()} className="absolute bottom-3 right-3 p-1.5 bg-wiki-accent text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/20">
              {sending ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-wiki-surface/50 border border-wiki-border rounded-lg p-4 text-center text-sm text-wiki-muted">Connectez-vous pour participer à la discussion.</div>
      )}

      {/* MODALE DE CONFIRMATION */}
      <ConfirmModal 
        isOpen={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={confirmDelete}
        title="Supprimer le commentaire ?"
        message="Cette action est irréversible. Le commentaire disparaîtra définitivement."
        confirmText="Oui, supprimer"
      />
    </div>
  );
}