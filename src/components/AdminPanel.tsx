import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, deleteDoc, doc, onSnapshot, orderBy, addDoc, getDocs, updateDoc } from 'firebase/firestore';
import { Users, Calendar, Trash2, Plus, Search, Clock, ShieldCheck, MessageSquare, Loader2, User, XCircle, Camera, Ban, CheckSquare, Square, Trash, Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function AdminPanel({ appId, showAlert, showConfirm }: any) {
  const [activeTab, setActiveTab] = useState('bookings');
  const [loading, setLoading] = useState(true);
  
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

  const removeStudentPhoto = async (studentId: string) => {
    showConfirm("Remover Foto", "Tem certeza que deseja remover a foto deste aluno?", async () => {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'users', studentId), {
          photoBase64: null
        });
        showAlert("Sucesso", "Foto removida.", "success");
      } catch (e) {
        console.error(e);
        showAlert("Erro", "Falha ao remover foto.", "error");
      }
    });
  };

  const muteStudent = async (studentId: string, name: string, hours: number | 'perm') => {
    const hoursNum = hours === 'perm' ? 87600 : hours; // 10 years for perm
    const mutedUntil = new Date(Date.now() + (hoursNum as number) * 60 * 60 * 1000).toISOString();
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'users', studentId), {
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
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'users', studentId), {
        mutedUntil: null
      });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, mutedUntil: null } : s));
      showAlert("Sucesso", `Silenciamento de ${name} removido.`, "success");
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Falha ao remover silenciamento.", "error");
    }
  };

  const fetchStudents = async () => {
    if (searchQuery.length < 3) {
      showAlert("Aviso", "Digite pelo menos 3 letras para buscar.", "info");
      return;
    }
    const q = query(collection(db, 'artifacts', appId, 'public', 'users'), orderBy('name'));
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(doc => {
      const data = doc.data();
      if (data.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (data.nickname && data.nickname.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (data.studentLogin && data.studentLogin.toLowerCase().includes(searchQuery.toLowerCase()))) {
        list.push({ id: doc.id, ...data });
      }
    });
    setStudents(list);
    if (list.length === 0) showAlert("Aviso", "Nenhum aluno encontrado.", "info");
  };

  useEffect(() => {
    if (activeTab === 'students' && searchQuery.length >= 3) {
      const timeoutId = setTimeout(fetchStudents, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, activeTab, appId]);

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
                           <h5 className="font-bold text-xs truncate dark:text-white">{post.studentName}</h5>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {students.map(s => (
                  <div key={s.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-4 relative overflow-hidden transition-all hover:shadow-md">
                    {s.mutedUntil && new Date(s.mutedUntil) > new Date() && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1 text-[9px] font-bold uppercase rounded-bl-lg">Silenciado</div>
                    )}
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0 border-2 border-white dark:border-gray-600 shadow-sm relative group">
                        {s.photoBase64 ? <img src={s.photoBase64} className="w-full h-full object-cover" /> : <User size={28} className="text-gray-300" />}
                        {s.photoBase64 && (
                          <button 
                            onClick={() => removeStudentPhoto(s.id, s.name)}
                            className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            title="Remover Foto"
                          >
                            <Camera size={18} />
                          </button>
                        )}
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
                    
                    <div className="flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
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
        </AnimatePresence>
      )}
    </div>
  );
}
