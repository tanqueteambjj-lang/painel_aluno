import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, where, deleteDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { Calendar, Clock, User, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, startOfToday, isBefore, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Scheduling({ currentUserData, appId, showAlert }: any) {
  const [loading, setLoading] = useState(true);
  const [gymSchedule, setGymSchedule] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [bookingLoadingId, setBookingLoadingId] = useState<string | null>(null);

  const daysToShow = 14; // Look ahead 2 weeks

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'gymSchedule'));
        const snap = await getDocs(q);
        const schedule: any[] = [];
        snap.forEach(doc => schedule.push({ id: doc.id, ...doc.data() }));
        setGymSchedule(schedule);
      } catch (e) {
        console.error("Erro ao carregar horários:", e);
      }
    };

    const unsubBookings = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), where('studentId', '==', currentUserData.id)),
      (snap) => {
        const bookings: any[] = [];
        snap.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));
        setMyBookings(bookings);
        setLoading(false);
      }
    );

    loadSchedule();
    return () => unsubBookings();
  }, [appId, currentUserData.id]);

  const handleBooking = async (classItem: any) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const classId = classItem.id;
    
    // Check if already booked
    const alreadyBooked = myBookings.find(b => b.classId === classId && b.date === dateStr);
    if (alreadyBooked) {
      showAlert("Aviso", "Você já está agendado para esta aula.", "info");
      return;
    }

    setBookingLoadingId(classId);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        studentId: currentUserData.id,
        studentName: currentUserData.nickname || currentUserData.name,
        studentPhoto: currentUserData.photoBase64 || null,
        classId,
        className: classItem.name,
        classTime: classItem.time,
        date: dateStr,
        timestamp: new Date().toISOString()
      });
      showAlert("Sucesso", "Aula agendada com sucesso! Oss!", "success");
    } catch (e) {
      console.error("Erro ao agendar:", e);
      showAlert("Erro", "Não foi possível realizar o agendamento.", "error");
    } finally {
      setBookingLoadingId(null);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bookings', bookingId));
      showAlert("Sucesso", "Agendamento cancelado.", "success");
    } catch (e) {
      console.error("Erro ao cancelar:", e);
      showAlert("Erro", "Não foi possível cancelar o agendamento.", "error");
    }
  };

  const getDayName = (date: Date) => format(date, 'eee', { locale: ptBR });
  const getDayLabel = (date: Date) => format(date, 'EEEE', { locale: ptBR });
  
  // Day indexing for gymSchedule (0-6, starting Sunday)
  const selectedDayIndex = selectedDate.getDay();
  const classesForDay = gymSchedule.filter(c => c.day === selectedDayIndex).sort((a,b) => a.time.localeCompare(b.time));

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-brand-dark dark:text-white flex items-center gap-3">
          <Calendar className="text-brand-red w-8 h-8" /> Agendamento de Aula
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Escolha o melhor horário para o seu treino e garanta sua vaga no tatame.</p>
      </div>

      {/* Date Selector */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar scroll-smooth">
        {Array.from({ length: daysToShow }).map((_, i) => {
          const date = addDays(startOfToday(), i);
          const isSelected = isSameDay(date, selectedDate);
          return (
            <motion.button
              key={i}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedDate(date)}
              className={`flex flex-col items-center justify-center min-w-[70px] h-[90px] rounded-2xl transition shadow-sm border ${
                isSelected 
                  ? 'bg-brand-red text-white border-brand-red shadow-lg' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-brand-red/50'
              }`}
            >
              <span className={`text-[10px] uppercase font-bold tracking-tighter ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                {getDayName(date)}
              </span>
              <span className="text-2xl font-display font-bold mt-1">
                {format(date, 'dd')}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Available Classes */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-xl text-brand-dark dark:text-white uppercase tracking-tight">
              Aulas para {getDayLabel(selectedDate)}
            </h3>
            <span className="text-xs font-bold text-gray-400">{format(selectedDate, 'dd/MM')}</span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
              </div>
            ) : classesForDay.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-700">
                <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Não há aulas cadastradas para este dia.</p>
              </div>
            ) : (
              classesForDay.map((c) => {
                const booking = myBookings.find(b => b.classId === c.id && b.date === format(selectedDate, 'yyyy-MM-dd'));
                const isPast = isBefore(selectedDate, startOfToday()) || (isSameDay(selectedDate, startOfToday()) && c.time < format(new Date(), 'HH:mm'));

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border flex items-center justify-between gap-4 ${
                      booking ? 'border-green-500 ring-2 ring-green-500/20' : 'border-gray-100 dark:border-gray-700'
                    } ${isPast ? 'opacity-50 grayscale' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${
                        booking ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-brand-red'
                      }`}>
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-gray-400 uppercase tracking-widest">{c.time}</span>
                        <h4 className="font-display font-bold text-lg dark:text-white leading-tight uppercase">{c.name}</h4>
                        {booking && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase mt-1">
                            <CheckCircle className="w-3 h-3" /> Você está agendado
                          </span>
                        )}
                      </div>
                    </div>

                    {!isPast && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => booking ? cancelBooking(booking.id) : handleBooking(c)}
                        disabled={bookingLoadingId === c.id}
                        className={`px-6 py-2 rounded-xl font-bold text-sm transition shadow-md min-w-[120px] ${
                          booking 
                            ? 'bg-gray-100 text-red-500 hover:bg-red-50 dark:bg-gray-700 dark:text-red-400' 
                            : 'bg-brand-red text-white hover:bg-red-700'
                        }`}
                      >
                        {bookingLoadingId === c.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 
                         booking ? 'Cancelar' : 'Agendar'}
                      </motion.button>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* My Upcoming Bookings Summary */}
        <div className="space-y-6">
          <div className="bg-brand-dark rounded-2xl p-6 text-white shadow-xl">
            <h3 className="font-display font-bold text-xl uppercase tracking-tight mb-4 flex items-center gap-2">
              <CheckCircle className="text-brand-red" /> Meus Agendamentos
            </h3>
            <div className="space-y-4">
              {myBookings.filter(b => !isBefore(parseISO(b.date), startOfToday())).length === 0 ? (
                <p className="text-sm text-gray-400">Você não possui agendamentos futuros.</p>
              ) : (
                myBookings
                  .filter(b => !isBefore(parseISO(b.date), startOfToday()))
                  .sort((a,b) => a.date.localeCompare(b.date) || a.classTime.localeCompare(b.classTime))
                  .slice(0, 5)
                  .map((b) => (
                    <div key={b.id} className="flex flex-col gap-1 border-l-2 border-brand-red pl-3 py-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">{format(parseISO(b.date), 'dd/MM/yyyy')} - {b.classTime}</span>
                      <span className="text-sm font-bold uppercase">{b.className}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
