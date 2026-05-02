import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, deleteDoc, doc, onSnapshot, orderBy, addDoc, getDocs, updateDoc } from 'firebase/firestore';
import { Users, Calendar, Trash2, Plus, Search, Clock, ShieldCheck, MessageSquare, Loader2, User, XCircle, Camera, Ban, CheckSquare, Square, Trash, Edit2, Check, X, Star, Medal, Target, Flame, Sun, ArrowUpCircle, Award, Shield, Crown, Zap, Trophy, AlertTriangle, TrendingDown, TrendingUp, UserPlus, Link } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminPanel({ appId, showAlert, showConfirm }: any) {
  const [activeTab, setActiveTab] = useState('bookings');
  const [loading, setLoading] = useState(true);
  const [extraXPValue, setExtraXPValue] = useState(100);
  const [isLinkingFamily, setIsLinkingFamily] = useState<{ studentId: string, name: string } | null>(null);
  
  // Custom Achievements Management
  const [customAchievements, setCustomAchievements] = useState<any[]>([]);
  const [newAchievement, setNewAchievement] = useState({ name: '', desc: '', iconName: 'Trophy' });
  const [isAddingAchievement, setIsAddingAchievement] = useState(false);
  
  // Icons helper for custom achievements
  const iconOptions: Record<string, any> = {
    'Trophy': Trophy, 'Star': Star, 'Medal': Medal, 'Target': Target, 
    'Flame': Flame, 'Sun': Sun, 'Zap': Zap, 'Shield': Shield, 
    'Crown': Crown, 'Award': Award, 'Target-Red': Target
  };
  
  // Schedule Management
  const [gymSchedule, setGymSchedule] = useState<any[]>([]);
  const [newClass, setNewClass] = useState({ days: [1], times: '18:00', name: '' });
  const [editingClass, setEditingClass] = useState<any>(null);
  
  // Bookings Management
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBookingDate, setSelectedBookingDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Feed Management
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string[]>([]);
  
  // Student Search
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const removeStudentPhoto = async (studentId: string, name: string) => {
    showConfirm("Remover Foto", `Tem certeza que deseja remover a foto de ${name}?`, async () => {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
          photoBase64: null
        });
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, photoBase64: null } : s));
        setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, photoBase64: null } : s));
        showAlert("Sucesso", "Foto removida.", "success");
      } catch (e) {
        console.error(e);
        showAlert("Erro", "Falha ao remover foto.", "error");
      }
    });
  };

  const updateStudentPhoto = async (studentId: string, base64: string) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
        photoBase64: base64
      });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, photoBase64: base64 } : s));
      setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, photoBase64: base64 } : s));
      showAlert("Sucesso", "Foto atualizada com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao atualizar foto.", "error");
    }
  };

  const handlePhotoChange = (e: any, studentId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit file size to ~1MB
      if (file.size > 1024 * 1024) {
        showAlert("Aviso", "A imagem deve ter no máximo 1MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateStudentPhoto(studentId, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const muteStudent = async (studentId: string, name: string, hours: number | 'perm') => {
    const hoursNum = hours === 'perm' ? 87600 : hours; // 10 years for perm
    const mutedUntil = new Date(Date.now() + (hoursNum as number) * 60 * 60 * 1000).toISOString();
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
        mutedUntil: mutedUntil
      });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, mutedUntil } : s));
      showAlert("Sucesso", `${name} silenciado por ${hours === 'perm' ? 'tempo indeterminado' : hours + ' horas'}.`, "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao silenciar aluno.", "error");
    }
  };

  const unmuteStudent = async (studentId: string, name: string) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
        mutedUntil: null
      });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, mutedUntil: null } : s));
      showAlert("Sucesso", `Silenciamento de ${name} removido.`, "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao remover silenciamento.", "error");
    }
  };

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchStudents = async () => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('name'));
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    setAllStudents(list);
    setStudents(list);
  };

  useEffect(() => {
    if ((activeTab === 'students' || activeTab === 'achievements') && allStudents.length === 0) {
      fetchStudents();
    }
  }, [activeTab, appId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setStudents(allStudents);
    } else {
      const q = searchQuery.toLowerCase();
      const filtered = allStudents.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) || 
        (s.nickname && s.nickname.toLowerCase().includes(q)) ||
        (s.studentLogin && s.studentLogin.toLowerCase().includes(q))
      );
      setStudents(filtered);
    }
  }, [searchQuery, allStudents]);

  const weekDays = [
    { id: 0, name: 'Domingo' },
    { id: 1, name: 'Segunda-feira' },
    { id: 2, name: 'Terça-feira' },
    { id: 3, name: 'Quarta-feira' },
    { id: 4, name: 'Quinta-feira' },
    { id: 5, name: 'Sexta-feira' },
    { id: 6, name: 'Sábado' },
  ];

  useEffect(() => {
    setLoading(true);
    
    // Gym Schedule Listener
    const unsubSchedule = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'gymSchedule'), (snap) => {
      const schedule: any[] = [];
      snap.forEach(doc => schedule.push({ id: doc.id, ...doc.data() }));
      setGymSchedule(schedule.sort((a,b) => a.day - b.day || a.time.localeCompare(b.time)));
    });

    // Bookings Listener (for selected date)
    const unsubBookings = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), where('date', '==', selectedBookingDate)),
      (snap) => {
        const booked: any[] = [];
        snap.forEach(doc => booked.push({ id: doc.id, ...doc.data() }));
        setBookings(booked);
      }
    );

    // Feed Listener
    const unsubFeed = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'feed'), (snap) => {
      const posts: any[] = [];
      const now = new Date().toISOString();
      let hasExpired = false;

      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.expiresAt && data.expiresAt < now) {
          hasExpired = true;
          // Delete expired post
          deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feed', docSnap.id)).catch(console.error);
        } else {
          posts.push({ id: docSnap.id, ...data });
        }
      });
      
      if (!hasExpired) {
        setFeedPosts(posts.sort((a,b) => b.timestamp.localeCompare(a.timestamp)));
      }
    });

    // Custom Achievements Listener
    const unsubAchievements = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'adminAchievements'), (snap) => {
      const achs: any[] = [];
      snap.forEach(doc => achs.push({ id: doc.id, ...doc.data() }));
      setCustomAchievements(achs);
      setLoading(false);
    });

    return () => {
      unsubSchedule();
      unsubBookings();
      unsubFeed();
      unsubAchievements();
    };
  }, [appId, selectedBookingDate]);

  const addAchievement = async () => {
    if (!newAchievement.name) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'adminAchievements'), newAchievement);
      setNewAchievement({ name: '', desc: '', iconName: 'Trophy' });
      setIsAddingAchievement(false);
      showAlert("Sucesso", "Conquista criada com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Erro ao criar conquista.", "error");
    }
  };

  const deleteAchievement = async (id: string) => {
    showConfirm("Apagar Conquista", "Deseja remover esta conquista permanentemente?", async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'adminAchievements', id));
      } catch (e) { console.error(e); }
    });
  };

  const getStudentAchievements = (student: any) => {
    const badges: any[] = [];
    const totalAtt = student.attendance ? student.attendance.length : 0;
    
    // Dynamic badges logic (simplified for admin preview)
    if (totalAtt >= 1) badges.push({ id: 'first_class', icon: <Star className="w-3 h-3 text-yellow-500" />, name: "Primeiro Treino" });
    if (totalAtt >= 12) badges.push({ id: 'beginner', icon: <Medal className="w-3 h-3 text-gray-400" />, name: "Iniciante" });
    if (totalAtt >= 50) badges.push({ id: 'warrior', icon: <Medal className="w-3 h-3 text-yellow-600" />, name: "Guerreiro" });
    if (totalAtt >= 100) badges.push({ id: 'centurion', icon: <Flame className="w-3 h-3 text-orange-500" />, name: "Centurião" });
    if (totalAtt >= 200) badges.push({ id: 'casca_grossa', icon: <Shield className="w-3 h-3 text-stone-500" />, name: "Casca Grossa" });
    if (totalAtt >= 500) badges.push({ id: 'mestre', icon: <Crown className="w-3 h-3 text-amber-500" />, name: "Mestre" });
    
    if (student.belt && student.belt.toLowerCase().includes('preta')) {
      badges.push({ id: 'black_belt', icon: <Crown className="w-3 h-3 text-black dark:text-gray-100" />, name: "A Lenda" });
    }

    // Manual achievements from admin
    if (student.achievements) {
      student.achievements.forEach((achId: string) => {
        const custom = customAchievements.find(ca => ca.id === achId);
        if (custom) {
          const Icon = iconOptions[custom.iconName] || Trophy;
          badges.push({ id: custom.id, icon: <Icon className="w-3 h-3 text-brand-red" />, name: custom.name });
        }
      });
    }

    return badges;
  };

  const addExtraXP = async (studentId: string, name: string) => {
    showConfirm("Adicionar XP", `Deseja adicionar ${extraXPValue} XP para ${name}?`, async () => {
      const student = allStudents.find(s => s.id === studentId);
      const currentXP = student?.extraXP || 0;
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
          extraXP: currentXP + extraXPValue
        });
        setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, extraXP: currentXP + extraXPValue } : s));
        showAlert("Sucesso", `XP adicionado com sucesso!`, "success");
      } catch (e) {
        console.error(e);
        showAlert("Erro", "Falha ao adicionar XP.", "error");
      }
    });
  };

  const linkAccount = async (studentId: string, parentId: string) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
        parentId: parentId
      });
      setAllStudents(prev => prev.map(s => s.id === studentId ? { ...s, parentId } : s));
      setIsLinkingFamily(null);
      showAlert("Sucesso", "Conta vinculada com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao vincular conta.", "error");
    }
  };

  const getInactiveStudents = () => {
    const now = new Date();
    return allStudents.map(s => {
      if (!Array.isArray(s.attendance) || s.attendance.length === 0) return { ...s, daysInactive: 999 };
      const lastAtt = new Date([...s.attendance].sort().pop() + 'T12:00:00');
      const diffDays = Math.floor((now.getTime() - lastAtt.getTime()) / (1000 * 60 * 60 * 24));
      return { ...s, daysInactive: diffDays };
    }).filter(s => s.daysInactive >= 10).sort((a,b) => b.daysInactive - a.daysInactive);
  };

  const assignAchievement = async (studentId: string, currentAchs: string[] = []) => {
    // This is simple: we'll show a prompt or just use a predefined list in this turn
    // For now, let's just make it possible via a toggle if we show the list
  };

  const toggleAchievementForStudent = async (student: any, achId: string) => {
    const currentAchs = student.achievements || [];
    const newAchs = currentAchs.includes(achId) 
      ? currentAchs.filter((id: string) => id !== achId)
      : [...currentAchs, achId];
    
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id), {
        achievements: newAchs
      });
      setAllStudents(prev => prev.map(s => s.id === student.id ? { ...s, achievements: newAchs } : s));
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao atualizar conquistas do aluno.", "error");
    }
  };

  const addClass = async () => {
    if (!newClass.name) {
      showAlert("Aviso", "A aula precisa de um nome.", "error");
      return;
    }
    if (newClass.days.length === 0) {
      showAlert("Aviso", "Selecione pelo menos um dia da semana.", "error");
      return;
    }
    try {
      const timesArray = newClass.times.split(',').map(t => t.trim()).filter(t => t);
      for (const day of newClass.days) {
        for (const t of timesArray) {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'gymSchedule'), {
            day: Number(day),
            time: t,
            name: newClass.name
          });
        }
      }
      setNewClass({ ...newClass, name: '', days: [1] });
      showAlert("Sucesso", "Horário(s) adicionado(s) com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao adicionar horário.", "error");
    }
  };

  const updateClass = async () => {
    if (!editingClass || !editingClass.name || !editingClass.time) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gymSchedule', editingClass.id), {
        name: editingClass.name,
        time: editingClass.time,
        day: Number(editingClass.day)
      });
      setEditingClass(null);
      showAlert("Sucesso", "Horário atualizado com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao atualizar horário.", "error");
    }
  };

  const removeClass = async (id: string) => {
    showConfirm("Remover Horário", "Isso apagará permanentemente esta aula da grade. Continuar?", async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gymSchedule', id));
        setSelectedSchedule(prev => prev.filter(item => item !== id));
      } catch (e) { console.error(e); }
    });
  };

  const bulkDeleteSchedule = async () => {
    if (selectedSchedule.length === 0) return;
    showConfirm("Remover Lote", `Apagar ${selectedSchedule.length} horários da grade permanentemente?`, async () => {
      try {
        for (const id of selectedSchedule) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gymSchedule', id));
        }
        setSelectedSchedule([]);
        showAlert("Sucesso", "Horários removidos com sucesso!", "success");
      } catch (e) { console.error(e); }
    });
  };

  const deleteDaySchedule = async (dayId: number, dayName: string) => {
    showConfirm("Apagar Dia Inteiro", `Tem certeza que deseja apagar TODOS os horários de ${dayName}?`, async () => {
      try {
        const dayClasses = gymSchedule.filter(c => c.day === dayId);
        for (const c of dayClasses) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gymSchedule', c.id));
        }
        showAlert("Sucesso", `Horários de ${dayName} removidos.`, "success");
      } catch (e) { console.error(e); }
    });
  };

  const toggleScheduleSelection = (id: string) => {
    setSelectedSchedule(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const deletePost = async (postId: string) => {
    showConfirm("Remover Post", "Tem certeza que deseja apagar este post do feed?", async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feed', postId));
        setSelectedPosts(prev => prev.filter(id => id !== postId));
      } catch (e) { console.error(e); }
    });
  };

  const bulkDeletePosts = async () => {
    if (selectedPosts.length === 0) return;
    showConfirm("Remover Lote", `Apagar ${selectedPosts.length} posts do feed permanentemente?`, async () => {
      try {
        for (const id of selectedPosts) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feed', id));
        }
        setSelectedPosts([]);
        showAlert("Sucesso", "Posts removidos com sucesso!", "success");
      } catch (e) { console.error(e); }
    });
  };

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev => prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]);
  };

  const removeBooking = async (id: string, studentName: string) => {
    showConfirm("Remover Agendamento", `Remover ${studentName} desta aula?`, async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', id));
      } catch (e) { console.error(e); }
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-brand-dark dark:text-white flex items-center gap-3">
             <ShieldCheck className="text-brand-red w-8 h-8" /> Painel de Administração
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie a grade horária, agendamentos e o feed da equipe.</p>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shadow-inner scroll-smooth overflow-x-auto">
          {[
            { id: 'bookings', label: 'Agendamentos', icon: Calendar },
            { id: 'schedule', label: 'Grade Horária', icon: Clock },
            { id: 'feed', label: 'Feed', icon: MessageSquare },
            { id: 'students', label: 'Alunos', icon: Users },
            { id: 'achievements', label: 'Conquistas', icon: Trophy },
            { id: 'churn', label: 'Evasão', icon: TrendingDown },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shrink-0 ${
                activeTab === tab.id 
                  ? 'bg-white dark:bg-gray-700 text-brand-red shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-brand-red" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* BOOKINGS VIEW */}
          {activeTab === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg dark:text-white">Agendamentos do Dia</h3>
                  <p className="text-sm text-gray-400">Veja quem agendou aula para uma data específica.</p>
                </div>
                <input 
                  type="date" 
                  value={selectedBookingDate}
                  onChange={(e) => setSelectedBookingDate(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gymSchedule.filter(c => c.day === new Date(selectedBookingDate + 'T12:00:00').getDay()).map(c => {
                  const classBookings = bookings.filter(b => b.classId === c.id);
                  return (
                    <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-b border-gray-100 dark:border-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-brand-red uppercase tracking-widest">{c.time}</span>
                          <span className="text-xs font-bold text-gray-400 uppercase">{classBookings.length} Alunos</span>
                        </div>
                        <h4 className="font-display font-bold text-lg dark:text-white uppercase mt-1">{c.name}</h4>
                      </div>
                      <div className="p-4 space-y-2">
                        {classBookings.length === 0 ? (
                           <p className="text-xs text-gray-400 italic py-2">Nenhum aluno agendado.</p>
                        ) : (
                          classBookings.map(b => (
                            <div key={b.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 group">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 overflow-hidden">
                                   {b.studentPhoto ? <img src={b.studentPhoto} className="w-full h-full object-cover" /> : (b.studentFullName || b.studentName || '?').charAt(0)}
                                </div>
                                <span className="text-sm font-medium dark:text-gray-200">{b.studentFullName || b.studentName}</span>
                              </div>
                              <button 
                                onClick={() => removeBooking(b.id, b.studentName)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition p-1"
                              >
                                <XCircle size={14} className="LucideIcon" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* SCHEDULE VIEW */}
          {activeTab === 'schedule' && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add New Class Form */}
                <div className="lg:col-span-1">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-8">
                    <h3 className="font-bold text-lg mb-6 dark:text-white flex items-center gap-2">
                      <Plus className="text-brand-red" /> Novo Horário
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Aula</label>
                        <input 
                          type="text" 
                          value={newClass.name}
                          onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                          placeholder="Ex: Jiu-Jitsu Iniciantes"
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Dias da Semana</label>
                        <div className="grid grid-cols-2 gap-2">
                          {weekDays.map(d => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                const days = newClass.days.includes(d.id)
                                  ? newClass.days.filter(id => id !== d.id)
                                  : [...newClass.days, d.id];
                                setNewClass({...newClass, days});
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${newClass.days.includes(d.id) ? 'bg-brand-red text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}
                            >
                              {newClass.days.includes(d.id) ? <CheckSquare size={12} /> : <Square size={12} />}
                              {d.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Horário(s) (ex: 18:00, 19:30)</label>
                        <input 
                          type="text" 
                          value={newClass.times}
                          onChange={(e) => setNewClass({...newClass, times: e.target.value})}
                          placeholder="00:00, 00:00"
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                        />
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={addClass}
                        className="w-full py-3 bg-brand-red text-white rounded-xl font-bold text-sm shadow-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                      >
                        <Plus size={18} /> Adicionar à Grade
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Grade Horária Atual */}
                <div className="lg:col-span-2 space-y-6">
                  {selectedSchedule.length > 0 && (
                    <div className="flex justify-end p-2">
                       <button 
                        onClick={bulkDeleteSchedule}
                        className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition shadow-lg flex items-center gap-2"
                      >
                        <Trash className="w-3.5 h-3.5" /> Apagar Seleção ({selectedSchedule.length})
                      </button>
                    </div>
                  )}
                  {weekDays.map(day => {
                    const dayClasses = gymSchedule.filter(c => c.day === day.id);
                    if (dayClasses.length === 0) return null;
                    return (
                      <div key={day.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 border-b border-gray-100 dark:border-gray-600 flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <h4 className="font-bold text-sm uppercase tracking-widest text-brand-dark dark:text-white">{day.name}</h4>
                            <span className="text-[10px] bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded text-gray-500 dark:text-gray-300 font-bold">{dayClasses.length} horários</span>
                          </div>
                          <button 
                            onClick={() => deleteDaySchedule(day.id, day.name)}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 transition flex items-center gap-1 uppercase"
                          >
                            <Trash2 size={12} /> Limpar Dia
                          </button>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                          {dayClasses.map(c => (
                            <div key={c.id} className={`flex items-center justify-between p-4 px-6 group hover:bg-gray-50/50 transition ${selectedSchedule.includes(c.id) ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                              <div className="flex items-center gap-4 flex-1">
                                <button 
                                  onClick={() => toggleScheduleSelection(c.id)}
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedSchedule.includes(c.id) ? 'bg-brand-red border-brand-red text-white' : 'border-gray-300 dark:border-gray-600'}`}
                                >
                                  {selectedSchedule.includes(c.id) && <CheckSquare size={10} />}
                                </button>
                                {editingClass?.id === c.id ? (
                                  <div className="flex flex-wrap items-center gap-2 flex-1">
                                    <select 
                                      value={editingClass.day}
                                      onChange={(e) => setEditingClass({...editingClass, day: parseInt(e.target.value)})}
                                      className="bg-white dark:bg-gray-900 border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                                    >
                                      {weekDays.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                    <input 
                                      type="text" 
                                      value={editingClass.time}
                                      onChange={(e) => setEditingClass({...editingClass, time: e.target.value})}
                                      className="w-16 bg-white dark:bg-gray-900 border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                                    />
                                    <input 
                                      type="text" 
                                      value={editingClass.name}
                                      onChange={(e) => setEditingClass({...editingClass, name: e.target.value})}
                                      className="flex-1 min-w-[120px] bg-white dark:bg-gray-900 border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                                    />
                                    <div className="flex items-center gap-1">
                                      <button onClick={updateClass} className="p-1 text-green-500 hover:text-green-600 transition"><Check size={16} /></button>
                                      <button onClick={() => setEditingClass(null)} className="p-1 text-gray-400 hover:text-gray-500 transition"><X size={16} /></button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-bold text-brand-red font-mono">{c.time}</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200 uppercase">{c.name}</span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => setEditingClass(c)}
                                  className="text-gray-300 hover:text-brand-red transition opacity-0 group-hover:opacity-100"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => removeClass(c.id)}
                                  className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* FEED VIEW */}
          {activeTab === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-brand-red w-5 h-5" />
                  <span className="font-bold dark:text-white">Gerenciar Feed</span>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full text-[10px]">{feedPosts.length} posts</span>
                </div>
                {selectedPosts.length > 0 && (
                  <button 
                    onClick={bulkDeletePosts}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition shadow-md"
                  >
                    <Trash className="w-3.5 h-3.5" /> Apagar Selecionados ({selectedPosts.length})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {feedPosts.length === 0 ? (
                  <div className="col-span-full text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500">Nenhum post no feed.</p>
                  </div>
                ) : (
                  feedPosts.map(post => (
                    <div key={post.id} className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border transition-all ${selectedPosts.includes(post.id) ? 'border-brand-red ring-2 ring-brand-red/10' : 'border-gray-100 dark:border-gray-700'} flex items-center gap-3`}>
                      <button 
                        onClick={() => togglePostSelection(post.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedPosts.includes(post.id) ? 'bg-brand-red border-brand-red text-white' : 'border-gray-300 dark:border-gray-600'}`}
                      >
                        {selectedPosts.includes(post.id) && <CheckSquare size={12} />}
                      </button>

                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0 border border-gray-100 dark:border-gray-600">
                        {post.studentPhoto ? <img src={post.studentPhoto} className="w-full h-full object-cover" /> : <User size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                           <h5 className="font-bold text-xs truncate dark:text-white">{post.studentFullName || post.studentName}</h5>
                           <span className="text-[9px] text-gray-400">Exp: {format(new Date(post.expiresAt), 'dd/MM')}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">{post.badgeName} - {post.message || 'Sem mensagem'}</p>
                      </div>
                      <button 
                        onClick={() => deletePost(post.id)}
                        className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition shadow-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* STUDENTS VIEW */}
          {activeTab === 'students' && (
            <motion.div
              key="students"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-3 text-gray-400 w-5 h-5" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar aluno por nome ou login..."
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                  />
                  <button 
                    onClick={fetchStudents}
                    className="absolute right-2 top-2 bg-brand-red px-3 py-1.5 rounded-lg text-white font-bold text-xs"
                  >
                    Recarregar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {students.map(s => (
                  <div key={s.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-4 relative overflow-hidden transition-all hover:shadow-md">
                    {s.mutedUntil && new Date(s.mutedUntil) > new Date() && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1 text-[9px] font-bold uppercase rounded-bl-lg">Silenciado</div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0 border-2 border-white dark:border-gray-600 shadow-sm relative group">
                        {s.photoBase64 ? <img src={s.photoBase64} className="w-full h-full object-cover" /> : <User size={28} className="text-gray-300" />}
                        
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                          <button 
                            onClick={() => s.photoBase64 && setSelectedPhoto(s.photoBase64)}
                            className="p-1 text-white hover:text-brand-red transition-colors"
                            title="Ampliar Foto"
                          >
                             <Search size={18} />
                          </button>
                          <label className="cursor-pointer p-1 text-white hover:text-brand-red transition-colors" title="Alterar Foto">
                            <Camera size={18} />
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handlePhotoChange(e, s.id)}
                            />
                          </label>
                          {s.photoBase64 && (
                            <button 
                              onClick={() => removeStudentPhoto(s.id, s.name)}
                              className="p-1 text-white hover:text-red-500 transition-colors"
                              title="Remover Foto"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                           <h5 className="font-bold dark:text-white text-base">{s.name}</h5>
                           {s.nickname && <span className="text-xs text-gray-400 font-medium tracking-tight">({s.nickname})</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            s.paymentStatus === 'Em dia' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {s.paymentStatus}
                          </span>
                          <span className="text-[10px] text-gray-400 uppercase font-bold">{s.belt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                      <div>
                        <p className="text-gray-400 font-bold uppercase text-[9px]">ID Sistema</p>
                        <p className="dark:text-white font-medium">{s.studentLogin}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase text-[9px]">Plano Atual</p>
                        <p className="dark:text-white font-medium truncate">{s.plan}</p>
                      </div>
                    </div>

                    {/* Minimalist Achievements Preview */}
                    <div className="flex flex-wrap gap-1 mt-1 px-1">
                      {getStudentAchievements(s).slice(0, 8).map((ach, idx) => (
                        <div key={idx} className="bg-gray-100 dark:bg-gray-700 p-1 rounded-md mb-1" title={ach.name}>
                          {ach.icon}
                        </div>
                      ))}
                      {getStudentAchievements(s).length > 8 && (
                        <div className="text-[9px] font-bold text-gray-400 self-center ml-1">
                          +{getStudentAchievements(s).length - 8}
                        </div>
                      )}
                      {getStudentAchievements(s).length === 0 && (
                        <span className="text-[9px] text-gray-400 italic">Sem conquistas</span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                      <div className="flex gap-2 w-full mb-2">
                        {/* XP Action */}
                        <div className="flex items-center gap-1 flex-1">
                          <input 
                            type="number" 
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-1.5 text-[10px] outline-none"
                            placeholder="XP Extra"
                            defaultValue={100}
                            id={`xp-${s.id}`}
                          />
                          <button 
                            onClick={() => {
                              const input = document.getElementById(`xp-${s.id}`) as HTMLInputElement;
                              const val = parseInt(input?.value || '100');
                              addExtraXP(s.id, val);
                            }}
                            className="bg-brand-red text-white p-1.5 rounded hover:bg-red-700 transition"
                            title="Atribuir XP Extra"
                          >
                            <Zap size={14} />
                          </button>
                        </div>
                        
                        {/* Family Connection */}
                        <button 
                          onClick={() => setIsLinkingFamily({ studentId: s.id, name: s.name })}
                          className={`flex-1 p-1.5 rounded flex items-center justify-center gap-1 text-[9px] font-bold uppercase transition ${s.parentId ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
                        >
                          <Users size={12} />
                          {s.parentId ? 'Vínculo ok' : 'Vincular'}
                        </button>
                      </div>

                      <div className="flex-1 flex gap-1 items-center">
                        <span className="text-[9px] font-bold text-gray-400 uppercase mr-1">Silenciar:</span>
                        {[
                          { hours: 24, label: '1d' },
                          { hours: 168, label: '7d' },
                          { hours: 720, label: '30d' },
                          { hours: 'perm', label: 'PERM' }
                        ].map(d => (
                          <button
                            key={d.label}
                            onClick={() => muteStudent(s.id, s.name, d.hours as any)}
                            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1.5 rounded-lg text-[9px] font-bold flex-1 transition-colors flex items-center justify-center gap-1"
                          >
                            <Ban size={10} /> {d.label}
                          </button>
                        ))}
                      </div>
                      {s.mutedUntil && (
                        <button 
                           onClick={() => unmuteStudent(s.id, s.name)}
                           className="px-3 py-1.5 rounded-lg text-[9px] font-bold bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 transition-colors"
                        >
                           Restaurar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ACHIEVEMENTS VIEW */}
          {activeTab === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-lg dark:text-white">Gerenciar Conquistas</h3>
                    <p className="text-sm text-gray-400">Crie medalhas personalizadas para seus alunos.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingAchievement(!isAddingAchievement)}
                    className="bg-brand-red text-white p-2 rounded-lg shadow-md hover:bg-red-700 transition"
                  >
                    {isAddingAchievement ? <X size={20} /> : <Plus size={20} />}
                  </button>
                </div>

                <AnimatePresence>
                  {isAddingAchievement && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-6"
                    >
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Conquista</label>
                            <input 
                              type="text" 
                              value={newAchievement.name}
                              onChange={(e) => setNewAchievement({...newAchievement, name: e.target.value})}
                              placeholder="Ex: Guerreiro da Semana"
                              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição Curta</label>
                            <input 
                              type="text" 
                              value={newAchievement.desc}
                              onChange={(e) => setNewAchievement({...newAchievement, desc: e.target.value})}
                              placeholder="Ex: Treinou todos os dias do desafio."
                              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Escolha o Ícone</label>
                          <div className="flex flex-wrap gap-2">
                            {Object.keys(iconOptions).map(iconKey => {
                              const IconComp = iconOptions[iconKey];
                              return (
                                <button
                                  key={iconKey}
                                  onClick={() => setNewAchievement({...newAchievement, iconName: iconKey})}
                                  className={`p-2 rounded-lg border transition ${newAchievement.iconName === iconKey ? 'bg-brand-red border-brand-red text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}
                                >
                                  <IconComp size={20} />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button 
                          onClick={addAchievement}
                          className="w-full bg-brand-red text-white py-2 rounded-lg font-bold text-sm shadow-md hover:bg-red-700 transition"
                        >
                          Criar Conquista
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {customAchievements.length === 0 ? (
                    <div className="col-span-full py-10 text-center text-gray-400 italic">
                      Nenhuma conquista personalizada criada ainda.
                    </div>
                  ) : (
                    customAchievements.map(ach => {
                      const IconComp = iconOptions[ach.iconName] || Trophy;
                      return (
                        <div key={ach.id} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                              <IconComp className="w-5 h-5 text-brand-red" />
                            </div>
                            <div>
                               <h4 className="font-bold text-sm dark:text-white">{ach.name}</h4>
                               <p className="text-[10px] text-gray-400 line-clamp-1">{ach.desc}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => deleteAchievement(ach.id)}
                            className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Assignment Section (Simplified) */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 dark:text-white">Atribuir Conquistas</h3>
                <p className="text-sm text-gray-400 mb-6">Busque um aluno e clique no ícone da conquista para atribuir ou remover.</p>
                
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-3 text-gray-400 w-5 h-5" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar alunos..."
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-1 focus:ring-brand-red dark:text-white"
                  />
                </div>

                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {(allStudents || []).filter(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10).map(s => (
                    <div key={s.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                           {s.photoBase64 ? (
                             <img 
                               src={s.photoBase64} 
                               className="w-full h-full object-cover cursor-pointer" 
                               onClick={() => setSelectedPhoto(s.photoBase64)}
                             />
                           ) : <User size={16} />}
                         </div>
                         <div className="min-w-0">
                            <p className="font-bold text-sm dark:text-white truncate">{s.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{s.belt}</p>
                         </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {customAchievements.map(ach => {
                          const IconComp = iconOptions[ach.iconName] || Trophy;
                          const hasAch = (s.achievements || []).includes(ach.id);
                          return (
                            <button
                              key={ach.id}
                              onClick={() => toggleAchievementForStudent(s, ach.id)}
                              className={`p-1.5 rounded-lg border transition flex items-center gap-2 ${hasAch ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 shadow-sm'}`}
                              title={ach.name}
                            >
                              <IconComp size={14} />
                              {hasAch && <Check size={10} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {allStudents.length === 0 && (
                     <div className="py-10 text-center text-gray-400 italic">
                        Carregando alunos...
                     </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {/* CHURN VIEW */}
          {activeTab === 'churn' && (
            <motion.div
              key="churn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                  <AlertTriangle className="text-red-500 w-8 h-8" />
                  <div>
                    <h3 className="font-bold text-xl dark:text-white">Alunos em Risco de Evasão</h3>
                    <p className="text-sm text-gray-400">Alunos que não treinam há mais de 10 dias.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getInactiveStudents().length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                      <TrendingUp className="mx-auto w-12 h-12 text-green-500 mb-4" />
                      <p className="text-gray-500 font-bold">Excelente! Todos os alunos estão ativos.</p>
                    </div>
                  ) : (
                    getInactiveStudents().map(s => (
                      <div key={s.id} className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0 border-2 border-red-200 dark:border-red-800">
                          {s.photoBase64 ? <img src={s.photoBase64} className="w-full h-full object-cover" /> : <User size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm dark:text-white truncate">{s.name}</h4>
                          <p className={`text-xs font-bold ${s.daysInactive > 15 ? 'text-red-600' : 'text-orange-600'}`}>
                            Inativo há {s.daysInactive} dias
                          </p>
                        </div>
                        <button 
                          onClick={() => window.open(`https://wa.me/${(s.phone || '').replace(/\D/g,'')}?text=Olá ${s.nickname || s.name}! Sentimos sua falta no tatame! Bora treinar? 🥋🔥`, '_blank')}
                          className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition shadow-lg"
                          title="Chamar no WhatsApp"
                        >
                           <MessageSquare size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      )}

      {/* FAMILY LINKING MODAL */}
      <AnimatePresence>
        {isLinkingFamily && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsLinkingFamily(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 dark:text-white">Vincular Família</h3>
              <p className="text-sm text-gray-500 mb-6">Selecione o Titular da Família para <strong>{isLinkingFamily.name}</strong>.</p>
              
              <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
                {allStudents.filter(os => os.id !== isLinkingFamily.studentId && !os.parentId).map(os => (
                  <button
                    key={os.id}
                    onClick={() => linkAccount(isLinkingFamily.studentId, os.id)}
                    className="w-full text-left p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-brand-red transition flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                       {os.photoBase64 ? <img src={os.photoBase64} className="w-full h-full object-cover" /> : <User size={16} className="m-2" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm dark:text-white">{os.name}</p>
                      <p className="text-[10px] text-gray-500">{os.id.slice(-6).toUpperCase()}</p>
                    </div>
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setIsLinkingFamily(null)}
                className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-bold text-sm"
              >
                Cancelar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL PARA AMPLIAR FOTO */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-2xl w-full max-h-[90vh] flex items-center justify-center p-4"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition p-2"
              >
                <X size={32} />
              </button>
              <img 
                src={selectedPhoto} 
                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain border-4 border-white/10" 
                alt="Foto Ampliada" 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
