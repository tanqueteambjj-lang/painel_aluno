import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, where, deleteDoc, doc, onSnapshot, orderBy } from 'firebase/firestore';
import { Settings, Users, Calendar, Trash2, Plus, Search, Clock, ShieldCheck, MessageSquare, Loader2, AlertCircle, ChevronRight, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminPanel({ appId, showAlert, showConfirm }: any) {
  const [activeTab, setActiveTab] = useState('bookings');
  const [loading, setLoading] = useState(true);
  
  // Schedule Management
  const [gymSchedule, setGymSchedule] = useState<any[]>([]);
  const [newClass, setNewClass] = useState({ day: 1, time: '18:00', name: '' });
  
  // Bookings Management
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBookingDate, setSelectedBookingDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Feed Management
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  
  // Student Search
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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
      snap.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
      setFeedPosts(posts.sort((a,b) => b.timestamp.localeCompare(a.timestamp)));
      setLoading(false);
    });

    return () => {
      unsubSchedule();
      unsubBookings();
      unsubFeed();
    };
  }, [appId, selectedBookingDate]);

  const addClass = async () => {
    if (!newClass.name) {
      showAlert("Aviso", "A aula precisa de um nome.", "error");
      return;
    }
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'gymSchedule'), newClass);
      setNewClass({ ...newClass, name: '' });
      showAlert("Sucesso", "Horário adicionado com sucesso!", "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao adicionar horário.", "error");
    }
  };

  const removeClass = async (id: string) => {
    showConfirm("Remover Horário", "Isso apagará permanentemente esta aula da grade. Continuar?", async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gymSchedule', id));
      } catch (e) { console.error(e); }
    });
  };

  const deletePost = async (postId: string) => {
    showConfirm("Remover Post", "Tem certeza que deseja apagar este post do feed?", async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'feed', postId));
      } catch (e) { console.error(e); }
    });
  };

  const removeBooking = async (id: string, studentName: string) => {
    showConfirm("Remover Agendamento", `Remover ${studentName} desta aula?`, async () => {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', id));
      } catch (e) { console.error(e); }
    });
  };

  const fetchStudents = async () => {
    if (searchQuery.length < 3) return;
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (data.name.toLowerCase().includes(searchQuery.toLowerCase()) || data.studentLogin?.includes(searchQuery)) {
           list.push({ id: doc.id, ...data });
        }
      });
      setStudents(list);
    } catch (e) { console.error(e); }
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
                                   {b.studentPhoto ? <img src={b.studentPhoto} className="w-full h-full object-cover" /> : b.studentName.charAt(0)}
                                </div>
                                <span className="text-sm font-medium dark:text-gray-200">{b.studentName}</span>
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

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dia da Semana</label>
                          <select 
                            value={newClass.day}
                            onChange={(e) => setNewClass({...newClass, day: parseInt(e.target.value)})}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                          >
                            {weekDays.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Horário</label>
                          <input 
                            type="time" 
                            value={newClass.time}
                            onChange={(e) => setNewClass({...newClass, time: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                          />
                        </div>
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
                  {weekDays.map(day => {
                    const dayClasses = gymSchedule.filter(c => c.day === day.id);
                    if (dayClasses.length === 0) return null;
                    return (
                      <div key={day.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 border-b border-gray-100 dark:border-gray-600">
                          <h4 className="font-bold text-sm uppercase tracking-widest text-brand-dark dark:text-white">{day.name}</h4>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                          {dayClasses.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-4 px-6 group hover:bg-gray-50/50 transition">
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-brand-red font-mono">{c.time}</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200 uppercase">{c.name}</span>
                              </div>
                              <button 
                                onClick={() => removeClass(c.id)}
                                className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
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
              className="max-w-2xl mx-auto space-y-4"
            >
              {feedPosts.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                  <p className="text-gray-500">Nenhum post no feed.</p>
                </div>
              ) : (
                feedPosts.map(post => (
                  <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                      {post.studentPhoto ? <img src={post.studentPhoto} className="w-full h-full object-cover" /> : <User size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                         <h5 className="font-bold text-sm truncate dark:text-white">{post.studentName}</h5>
                         <span className="text-[10px] text-gray-400">Expirando: {format(new Date(post.expiresAt), 'dd/MM HH:mm')}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{post.badgeName} - {post.message || 'Sem mensagem'}</p>
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
                    onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
                    placeholder="Buscar aluno por nome ou login (mínimo 3 letras)..."
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-red dark:text-white"
                  />
                  <button 
                    onClick={fetchStudents}
                    className="absolute right-2 top-2 bg-brand-red px-3 py-1.5 rounded-lg text-white font-bold text-xs"
                  >
                    Buscar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students.map(s => (
                  <div key={s.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border-2 border-gray-100">
                      {s.photoBase64 ? <img src={s.photoBase64} className="w-full h-full object-cover" /> : <User size={24} className="text-gray-300" />}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold dark:text-white text-sm">{s.name} {s.nickname ? `(${s.nickname})` : ''}</h5>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          s.paymentStatus === 'Em dia' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {s.paymentStatus}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold">{s.belt}</span>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-gray-400 uppercase font-bold">Login: {s.studentLogin}</p>
                       <p className="text-[10px] text-gray-500 mt-1">{s.plan}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function XCircle({ size, className }: { size: number, className?: string }) {
  return <Trash2 size={size} className={className} />;
}
