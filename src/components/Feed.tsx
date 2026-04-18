import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc, where, onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ThumbsUp, Trash2, RefreshCw, Users, Frown, Footprints, Flame, Dumbbell, ShieldHalf, Crown, Zap, Medal, Star, Swords, ArrowUpCircle, Trophy, MessageCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ICON_MAP: Record<string, any> = {
  Footprints, Flame, Dumbbell, ShieldHalf, Crown, Zap, Medal, Star, Swords, ArrowUpCircle, Trophy
};

const parseDateString = (dateStr: any) => {
  if (!dateStr) return new Date();
  if (dateStr.toDate) return dateStr.toDate();
  if (typeof dateStr === 'string') {
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
      }
    }
    return new Date(dateStr);
  }
  return new Date(dateStr);
};

export default function Feed({ currentUserData, appId, showAlert, showConfirm }: any) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCommentPostId, setOpenCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const renderBeltSVG = (beltStr: string) => {
    if (!beltStr) return null;
    const colors: Record<string, string> = { 'Branca': '#ffffff', 'Cinza': '#9ca3af', 'Amarela': '#fbbf24', 'Laranja': '#f97316', 'Verde': '#10b981', 'Azul': '#3b82f6', 'Roxa': '#8b5cf6', 'Marrom': '#78350f', 'Preta': '#000000' };
    let color = '#ffffff'; let degree = 0; let colorName = 'Branca';
    
    for (const [name, hex] of Object.entries(colors)) {
      if (beltStr.includes(name)) { color = hex; colorName = name; break; }
    }
    
    const degreeMatch = beltStr.match(/(\d)º/);
    if (degreeMatch) degree = parseInt(degreeMatch[1]);
    
    const width = 200; const height = 40; const tipWidth = 40; const stripeWidth = 6; const stripeGap = 5;
    const barColor = (colorName === 'Preta') ? '#dc2626' : '#000000';
    const stripeColor = '#ffffff';
    
    const stripes = [];
    for (let i = 0; i < degree; i++) {
        const x = width - 10 - (i * (stripeWidth + stripeGap)) - stripeWidth;
        stripes.push(<rect key={i} x={x} y="0" width={stripeWidth} height={height} fill={stripeColor} />);
    }
    
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <rect x="0" y="0" width={width} height={height} fill={color} />
        <rect x={width - tipWidth} y="0" width={tipWidth} height={height} fill={barColor} />
        {stripes}
      </svg>
    );
  };

  useEffect(() => {
    let unsub = () => {};
    if (appId) {
      setLoading(true);
      const now = new Date().toISOString();
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'feed'), where('expiresAt', '>', now));
      unsub = onSnapshot(q, (snap) => {
        const fetchedPosts: any[] = [];
        snap.forEach(doc => {
          fetchedPosts.push({ id: doc.id, ...doc.data() });
        });

        fetchedPosts.sort((a, b) => parseDateString(b.timestamp).getTime() - parseDateString(a.timestamp).getTime());
        setPosts(fetchedPosts);
        setLoading(false);
      }, (err) => {
        console.error("Erro ao carregar feed:", err);
        setLoading(false);
      });
    }
    return () => unsub();
  }, [appId, db, showAlert]);

  const deleteFeedPost = (postId: string) => {
    showConfirm("Apagar Publicação", "Tem certeza que deseja apagar esta publicação do Feed?", async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feed', postId));
        setPosts(posts.filter(p => p.id !== postId));
      } catch {
        showAlert("Erro", "Erro ao excluir publicação.", "error");
      }
    });
  };

  const likeFeedPost = async (postId: string, hasLiked: boolean, currentLikes: number) => {
    if(!currentUserData) return;

    const userName = (currentUserData.nickname || currentUserData.name).split(' ')[0];

    try {
      const updateQuery = hasLiked ? 
          { 
            likes: currentLikes - 1, 
            likedBy: arrayRemove(currentUserData.id),
            likedByNames: arrayRemove(userName)
          } : 
          { 
            likes: currentLikes + 1, 
            likedBy: arrayUnion(currentUserData.id),
            likedByNames: arrayUnion(userName)
          };
      
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feed', postId), updateQuery);
      
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            likes: hasLiked ? currentLikes - 1 : currentLikes + 1,
            likedBy: hasLiked ? p.likedBy.filter((id: string) => id !== currentUserData.id) : [...(p.likedBy || []), currentUserData.id],
            likedByNames: hasLiked ? (p.likedByNames || []).filter((name: string) => name !== userName) : [...(p.likedByNames || []), userName]
          };
        }
        return p;
      }));
    } catch (e) {
      console.error("Erro ao dar like:", e);
    }
  };

  const handleCommentSubmit = async (postId: string) => {
    if (!commentText.trim() || !currentUserData) return;
    try {
      const feedRef = doc(db, 'artifacts', appId, 'public', 'data', 'feed', postId);
      const newComment = {
        id: Math.random().toString(36).substr(2, 9),
        text: commentText.trim(),
        authorId: currentUserData.id,
        authorName: (currentUserData.nickname || currentUserData.name).split(' ')[0],
        timestamp: new Date().toISOString()
      };
      await updateDoc(feedRef, {
        comments: arrayUnion(newComment)
      });
      setCommentText("");
    } catch (e) {
      console.error("Erro ao enviar comentário", e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4 flex justify-between items-end">
        <div>
          <h2 className="font-display text-3xl font-bold text-brand-dark dark:text-white flex items-center gap-3">
            <Users className="text-blue-500 w-8 h-8" /> Feed da Equipe
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Veja as conquistas recentes da sua escola. Os compartilhamentos desaparecem após 24 horas.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {loading ? (
          <div className="text-center py-10">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">A carregar o feed...</p>
          </div>
        ) : posts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-10 text-center shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <Frown className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="font-bold text-gray-600 dark:text-gray-300">O feed está silencioso...</h3>
            <p className="text-sm text-gray-400 mt-1">Nenhuma conquista nova nas últimas 24 horas. Seja o primeiro a compartilhar!</p>
          </motion.div>
        ) : (
          posts.map((post, index) => {
            const hasLiked = post.likedBy && post.likedBy.includes(currentUserData?.id);
            const timeAgo = formatDistanceToNow(parseDateString(post.timestamp), { addSuffix: true, locale: ptBR });

            return (
              <motion.div 
                key={post.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    {post.studentPhoto ? (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
                        <img src={post.studentPhoto} loading="lazy" className="w-full h-full object-cover" alt="Avatar" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500 shrink-0">
                        {post.studentName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-white leading-tight">{post.studentName}</h4>
                      <p className="text-xs text-gray-500">{timeAgo}</p>
                    </div>
                  </div>
                  {post.studentId === currentUserData?.id && (
                    <button onClick={() => deleteFeedPost(post.id)} className="text-gray-400 hover:text-red-500 transition text-sm bg-gray-100 hover:bg-red-50 dark:bg-gray-700 dark:hover:bg-red-900/30 w-8 h-8 rounded-full flex items-center justify-center" title="Apagar Minha Publicação">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {post.message && (
                  <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">{post.message}</p>
                )}

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4 flex flex-col gap-4 border border-gray-100 dark:border-gray-600">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-3xl shadow-sm shrink-0">
                      {ICON_MAP[post.badgeIcon] ? (
                        (() => {
                          const IconComponent = ICON_MAP[post.badgeIcon];
                          return <IconComponent className="w-8 h-8 text-brand-red" />;
                        })()
                      ) : (
                        <i className={post.badgeIcon}></i>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-widest mb-1">Desbloqueou</p>
                      <h5 className="font-display text-xl font-bold text-brand-dark dark:text-gray-100 leading-tight">{post.badgeName}</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{post.badgeDesc}</p>
                    </div>
                  </div>
                  {post.beltStr && (
                    <div className="w-full h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 shadow-inner overflow-hidden relative mt-2">
                      {renderBeltSVG(post.beltStr)}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3 mt-2">
                  <div className="flex items-center gap-4">
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => likeFeedPost(post.id, hasLiked, post.likes || 0)} 
                      className="flex items-center gap-1.5 font-bold transition group outline-none"
                      title={hasLiked ? "Descurtir" : "Curtir (Oss!)"}
                    >
                      <ThumbsUp className={`w-5 h-5 ${hasLiked ? 'text-brand-red fill-brand-red' : 'text-gray-400 dark:text-gray-500 group-hover:text-brand-red'}`} />
                      {post.likes > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{post.likes}</span>
                      )}
                    </motion.button>

                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setOpenCommentPostId(openCommentPostId === post.id ? null : post.id)} 
                      className="flex items-center gap-1.5 font-bold transition group outline-none text-gray-400 dark:text-gray-500 hover:text-brand-red"
                      title="Comentar"
                    >
                      <MessageCircle className="w-5 h-5 group-hover:text-brand-red" />
                      {post.comments?.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{post.comments.length}</span>
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Comments Section */}
                <AnimatePresence>
                  {(openCommentPostId === post.id || (post.comments && post.comments.length > 0)) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 space-y-3"
                    >
                      {post.comments?.map((comment: any) => (
                        <div key={comment.id} className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500 text-[10px] shrink-0 mt-0.5">
                            {comment.authorName.charAt(0).toUpperCase()}
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl rounded-tl-none px-3 py-2 flex-1">
                            <h5 className="text-xs font-bold text-gray-900 dark:text-white leading-none mb-1">{comment.authorName}</h5>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{comment.text}</p>
                          </div>
                        </div>
                      ))}

                      {openCommentPostId === post.id && (
                        <div className="flex items-center gap-2 mt-2 sticky bottom-0 bg-white dark:bg-gray-800 py-2">
                          <input 
                            type="text" 
                            className="flex-1 bg-gray-100 dark:bg-gray-700 border-transparent focus:border-brand-red focus:ring-0 rounded-full px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500"
                            placeholder="Adicione um comentário..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommentSubmit(post.id);
                            }}
                            autoFocus
                          />
                          <button 
                            onClick={() => handleCommentSubmit(post.id)}
                            disabled={!commentText.trim()}
                            className="w-9 h-9 rounded-full bg-brand-red text-white flex items-center justify-center disabled:opacity-50 disabled:bg-gray-300 hover:bg-red-700 transition"
                          >
                            <Send className="w-4 h-4 ml-[-2px]" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
