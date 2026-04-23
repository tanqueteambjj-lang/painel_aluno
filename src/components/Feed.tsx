import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc, where, onSnapshot, addDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ThumbsUp, Trash2, RefreshCw, Users, Frown, Trophy, MessageCircle, Send, MessageSquare, X, Loader2, Camera, Footprints, Flame, Dumbbell, ShieldHalf, Crown, Zap, Medal, Star, Swords, ArrowUpCircle, Calendar, Sun, Award, Shield, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React from 'react';

const ICON_MAP: Record<string, any> = {
  Footprints, Flame, Dumbbell, ShieldHalf, Crown, Zap, Medal, Star, Swords, ArrowUpCircle, Trophy, Calendar, Sun, MessageSquare, Award, Shield, Target
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
  
  // Posting state
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        snap.forEach(docSnap => {
          fetchedPosts.push({ id: docSnap.id, ...docSnap.data() });
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
  }, [appId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showAlert("Arquivo muito grande", "A imagem deve ter no máximo 2MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewPostImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const createPost = async () => {
    if (!newPostText.trim() && !newPostImage) return;
    
    // Check if muted
    const now = new Date();
    if (currentUserData.mutedUntil && new Date(currentUserData.mutedUntil) > now) {
      const remaining = formatDistanceToNow(new Date(currentUserData.mutedUntil), { locale: ptBR });
      showAlert("Acesso Restrito", `Você está silenciado. Poderá postar novamente em ${remaining}.`, "error");
      return;
    }

    setIsPosting(true);
    try {
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const post = {
        studentId: currentUserData.id,
        studentName: currentUserData.nickname || currentUserData.name,
        studentPhoto: currentUserData.photoBase64 || null,
        badgeName: null,
        badgeDesc: null,
        badgeIcon: "MessageSquare",
        postImage: newPostImage,
        message: newPostText,
        timestamp: now.toISOString(),
        expiresAt: expiresAt,
        likes: 0,
        likedBy: [],
        likedByNames: [],
        comments: [],
        beltStr: currentUserData.belt || null
      };

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'feed'), post);
      setNewPostText("");
      setNewPostImage(null);
      showAlert("Sucesso", "Postagem enviada!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao enviar postagem.", "error");
    } finally {
      setIsPosting(false);
    }
  };

  const deleteFeedPost = (postId: string) => {
    showConfirm("Apagar Publicação", "Tem certeza que deseja apagar esta publicação do Feed?", async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feed', postId));
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
            likes: Math.max(0, currentLikes - 1), 
            likedBy: arrayRemove(currentUserData.id),
            likedByNames: arrayRemove(userName)
          } : 
          { 
            likes: currentLikes + 1, 
            likedBy: arrayUnion(currentUserData.id),
            likedByNames: arrayUnion(userName)
          };
      
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feed', postId), updateQuery);
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20">
      <div className="mb-6 pb-4 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-brand-dark dark:text-white flex items-center gap-3">
            <Users className="text-blue-500 w-8 h-8" /> Feed da Equipe
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Veja as conquistas recentes da sua escola. Os compartilhamentos desaparecem após 24 horas.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Create Post Area */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-xl shadow-brand-red/5 border border-gray-100 dark:border-gray-700/50">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-gray-600">
              {currentUserData.photoBase64 ? <img src={currentUserData.photoBase64} className="w-full h-full object-cover" /> : <Users size={24} className="text-gray-400" />}
            </div>
            <div className="flex-1 space-y-3">
              <textarea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="O que está acontecendo no tatame?"
                className="w-full bg-gray-50 dark:bg-gray-900/50 border-none rounded-2xl p-3 text-sm resize-none focus:ring-2 focus:ring-brand-red/20 dark:text-white min-h-[80px] outline-none"
              />
              
              <AnimatePresence>
                {newPostImage && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative group rounded-2xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                  >
                    <img src={newPostImage} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setNewPostImage(null)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-500 hover:bg-brand-red/10 hover:text-brand-red transition flex items-center justify-center"
                    title="Adicionar Foto"
                  >
                    <Camera size={20} />
                  </button>
                </div>
                <button
                  onClick={createPost}
                  disabled={isPosting || (!newPostText.trim() && !newPostImage)}
                  className="bg-brand-red text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-brand-red/90 transition shadow-lg shadow-brand-red/20 disabled:opacity-50 disabled:grayscale flex items-center gap-2"
                >
                  {isPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Publicar
                </button>
              </div>
            </div>
          </div>
        </div>

        {posts.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center shadow-xl shadow-brand-red/5 border border-gray-100 dark:border-gray-700/50"
          >
            <Frown className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" aria-hidden="true" />
            <h3 className="font-bold text-gray-600 dark:text-gray-300 text-xl">O feed está silencioso...</h3>
            <p className="text-sm text-gray-400 mt-1">Nenhuma publicação nas últimas 24 horas. Seja o primeiro a motivar a galera!</p>
          </motion.div>
        ) : (
          posts.map((post) => {
            const hasLiked = post.likedBy && post.likedBy.includes(currentUserData?.id);
            const timeAgo = formatDistanceToNow(parseDateString(post.timestamp), { addSuffix: true, locale: ptBR });

            return (
              <motion.article 
                key={post.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-brand-red/5 border border-gray-100 dark:border-gray-700/50 overflow-hidden group"
              >
                {/* Header */}
                <div className="p-5 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0 border-2 border-brand-red shadow-sm">
                      {post.studentPhoto ? (
                        <img src={post.studentPhoto} className="w-full h-full object-cover" alt={`Avatar de ${post.studentName}`} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 uppercase">
                          {post.studentName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                        {post.studentName}
                        {post.beltStr && (
                          <span className="text-[9px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-500 uppercase font-black tracking-tighter">
                            {post.beltStr}
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-medium">{timeAgo}</p>
                    </div>
                  </div>
                  
                  {(post.studentId === currentUserData?.id || currentUserData.role === 'admin') && (
                    <button 
                      onClick={() => deleteFeedPost(post.id)} 
                      className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                
                {/* Achievement Area */}
                {post.badgeName && (
                  <div className="mx-5 mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl flex items-center gap-4 border border-gray-100 dark:border-gray-800/50 shadow-inner">
                    <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-brand-red/10 flex items-center justify-center shrink-0">
                      {ICON_MAP[post.badgeIcon] ? 
                        React.createElement(ICON_MAP[post.badgeIcon], { className: "w-8 h-8 text-brand-red" }) : 
                        <Trophy className="w-8 h-8 text-brand-red" />
                      }
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-0.5">CONQUISTA DESBLOQUEADA</p>
                      <h5 className="font-bold text-gray-900 dark:text-white text-base leading-tight">{post.badgeName}</h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{post.badgeDesc}</p>
                    </div>
                  </div>
                )}

                {/* Message */}
                {post.message && (
                  <div className="px-5 pb-4">
                    <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                      {post.message}
                    </p>
                  </div>
                )}

                {/* Image Post Content */}
                {post.postImage && (
                  <div className="px-5 pb-5">
                    <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
                      <img src={post.postImage} className="w-full h-auto max-h-[500px] object-cover" />
                    </div>
                  </div>
                )}

                {/* Belt Visual (If Achievement) */}
                {post.badgeName && post.beltStr && (
                  <div className="px-5 pb-4">
                    <div className="w-full h-8 rounded-lg overflow-hidden shadow-inner border border-gray-100 dark:border-gray-700">
                      {renderBeltSVG(post.beltStr)}
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="px-5 py-3 bg-gray-50/50 dark:bg-gray-900/10 border-t border-gray-100 dark:border-gray-700/50 flex items-center gap-6">
                  <button 
                    onClick={() => likeFeedPost(post.id, hasLiked, post.likes || 0)}
                    className={`flex items-center gap-1.5 text-xs font-bold transition-all hover:scale-110 ${
                      hasLiked ? 'text-brand-red' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    <ThumbsUp size={18} fill={hasLiked ? 'currentColor' : 'none'} />
                    <span>{post.likes || 0}</span>
                  </button>

                  <button 
                    onClick={() => setOpenCommentPostId(openCommentPostId === post.id ? null : post.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-brand-red transition-colors"
                  >
                    <MessageCircle size={18} />
                    <span>{post.comments?.length || 0}</span>
                  </button>

                  <div className="ml-auto text-[10px] font-bold text-gray-300 flex items-center gap-1">
                    <RefreshCw size={10} /> 24H
                  </div>
                </div>

                {/* Comments Section */}
                <AnimatePresence>
                  {(openCommentPostId === post.id || (post.comments && post.comments.length > 0)) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-5 pb-4 space-y-3 overflow-hidden bg-gray-50/30 dark:bg-gray-900/10"
                    >
                      {post.comments?.map((comment: any) => (
                        <div key={comment.id} className="flex gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500 text-[10px] shrink-0 mt-0.5 border border-gray-200 dark:border-gray-600">
                            {comment.authorName.charAt(0).toUpperCase()}
                          </div>
                          <div className="bg-white dark:bg-gray-700/50 rounded-2xl rounded-tl-none px-3 py-2 flex-1 shadow-sm border border-gray-100 dark:border-gray-800">
                            <h5 className="text-[10px] font-bold text-gray-900 dark:text-white leading-none mb-1">{comment.authorName}</h5>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{comment.text}</p>
                          </div>
                        </div>
                      ))}

                      {openCommentPostId === post.id && (
                        <div className="flex items-center gap-2 py-2">
                          <input 
                            type="text" 
                            className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-brand-red/30 focus:border-brand-red"
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
                            className="w-8 h-8 rounded-full bg-brand-red text-white flex items-center justify-center disabled:opacity-30 hover:bg-red-700 transition shadow-md shadow-brand-red/10"
                          >
                            <Send size={14} className="ml-[-1px]" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })
        )}
      </div>
    </div>
  );
}
