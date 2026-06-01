import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, getDocs, collection, query, addDoc, updateDoc, arrayUnion, where } from 'firebase/firestore';
import { MapPin, Clock, CheckCircle, AlertTriangle, X, ShieldAlert, CheckSquare, Loader2, Award, Zap, Trophy, Flame, FlameKindling, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScanCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserData: any;
  appId: string;
  showAlert: (title: string, message: string, type: 'success' | 'error' | 'alert' | 'info') => void;
}

export default function ScanCheckinModal({ isOpen, onClose, currentUserData, appId, showAlert }: ScanCheckinModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'locating' | 'matching' | 'confirm_class' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [distanceToGym, setDistanceToGym] = useState<number | null>(null);
  const [classesToday, setClassesToday] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [gymConfig, setGymConfig] = useState({
    latitude: -23.5505,
    longitude: -46.6333,
    radius: 500,
    name: "Sede Tanque Team"
  });
  const [countdown, setCountdown] = useState(4);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load gym configuration settings
  useEffect(() => {
    if (!isOpen) return;

    const fetchConfigAndInitialize = async () => {
      setStatus('locating');
      try {
        // Load settings/gym
        const gymDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gym');
        const gymSnap = await getDoc(gymDocRef);
        let currentGymConfig = {
          latitude: -23.5505,
          longitude: -46.6333,
          radius: 500,
          name: "Sede Tanque Team"
        };
        
        if (gymSnap.exists()) {
          const data = gymSnap.data();
          currentGymConfig = {
            latitude: Number(data.latitude) || -23.5505,
            longitude: Number(data.longitude) || -46.6333,
            radius: Number(data.radius) || 500,
            name: data.name ?? "Sede Tanque Team"
          };
          setGymConfig(currentGymConfig);
        }

        // Get user location
        if (!navigator.geolocation) {
          throw new Error("Seu celular ou navegador não possui suporte a geolocalização.");
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            const distance = calculateDistance(latitude, longitude, currentGymConfig.latitude, currentGymConfig.longitude);
            setDistanceToGym(distance);

            if (distance > currentGymConfig.radius) {
              setStatus('error');
              setErrorMessage(`Você está fora da área permitida (${Math.round(distance)}m). Para confirmar sua presença, você precisa estar a menos de ${currentGymConfig.radius}m do tatame.`);
              return;
            }

            // Location is verified, move to scheduling check
            setStatus('matching');
            await loadAndMatchClasses(currentGymConfig);
          },
          (err) => {
            console.error("Geolocation error:", err);
            setStatus('error');
            setErrorMessage("Não foi possível obter sua localização por GPS. Certifique-se de liberar as permissões de geolocalização.");
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );

      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || "Ocorreu um erro ao inicializar a validação.");
      }
    };

    fetchConfigAndInitialize();

    return () => {
      stopCountdown();
    };
  }, [isOpen, appId]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia em metros
  };

  const loadAndMatchClasses = async (config: typeof gymConfig) => {
    try {
      const dayOfWeek = new Date().getDay();
      
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'gymSchedule'));
      const snap = await getDocs(q);
      const schedule: any[] = [];
      snap.forEach(doc => {
        const d = doc.data();
        if (d.day === dayOfWeek) {
          schedule.push({ id: doc.id, ...d });
        }
      });

      if (schedule.length === 0) {
        setStatus('error');
        setErrorMessage("Não há nenhum treino agendado para o dia de hoje.");
        return;
      }

      setClassesToday(schedule.sort((a,b) => a.time.localeCompare(b.time)));

      // Find the best class match based on closest starting time
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      let bestMatch = null;
      let minDiff = Infinity;

      for (const classItem of schedule) {
        if (!classItem.time) continue;
        const [hours, mins] = classItem.time.split(':').map(Number);
        const classMinutes = hours * 60 + mins;
        const diff = Math.abs(currentMinutes - classMinutes);

        if (diff < minDiff) {
          minDiff = diff;
          bestMatch = classItem;
        }
      }

      // If the closest class is within 60 minutes (45 min before or 60 min after class start)
      if (bestMatch && minDiff <= 60) {
        setSelectedClass(bestMatch);
        setStatus('confirm_class');
        startCountdown(bestMatch);
      } else {
        // Outside the automatic window, let them choose
        setStatus('confirm_class');
        setSelectedClass(null); // Force user to manually pick one of today's classes
      }

    } catch (err) {
      console.error("Database or loading error:", err);
      setStatus('error');
      setErrorMessage("Erro ao consultar a grade de horários.");
    }
  };

  // Cooldown Auto-booking
  const startCountdown = (classItem: any) => {
    setCountdown(4);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          stopCountdown();
          // Auto trigger presence
          handleConfirmPresence(classItem);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const handleConfirmPresence = async (classItem: any) => {
    stopCountdown();
    if (!classItem) return;

    setStatus('loading');
    try {
      const todayString = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
      
      // 1. Check if user already booked this class today
      const qBookings = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'bookings'),
        where('studentId', '==', currentUserData.id),
        where('classId', '==', classItem.id),
        where('date', '==', todayString)
      );
      const bookingCheck = await getDocs(qBookings);
      
      if (bookingCheck.empty) {
        // 2. Add Booking document
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
          studentId: currentUserData.id,
          studentName: currentUserData.nickname || currentUserData.name,
          studentFullName: currentUserData.name,
          studentPhoto: currentUserData.photoBase64 || null,
          classId: classItem.id,
          className: classItem.name,
          classTime: classItem.time,
          date: todayString,
          timestamp: new Date().toISOString()
        });
      }

      // 3. Update student attendance array if today isn't registered
      const attendedList = Array.isArray(currentUserData.attendance) ? currentUserData.attendance : [];
      if (!attendedList.includes(todayString)) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', currentUserData.id), {
          attendance: arrayUnion(todayString)
        });
      }

      setSelectedClass(classItem);
      setStatus('success');
      showAlert("Check-in Concluído", `Sua presença foi registrada na aula de ${classItem.name} às ${classItem.time}!`, "success");
    } catch (e) {
      console.error("Attendance registry error:", e);
      setStatus('error');
      setErrorMessage("Erro ao salvar o registro de presença no servidor.");
    }
  };

  const skipCountdown = () => {
    stopCountdown();
    handleConfirmPresence(selectedClass);
  };

  const manuallySelectClass = (classItem: any) => {
    stopCountdown();
    setSelectedClass(classItem);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 max-w-lg w-full relative border border-gray-100 dark:border-gray-700/60 my-auto text-center"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white flex items-center justify-center text-gray-500 dark:text-gray-300 transition-all shadow-md hover:scale-110"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Banner */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-12 h-1 bg-brand-red rounded-full mb-4"></div>
              <h3 className="font-display font-black text-2xl uppercase text-zinc-900 dark:text-white tracking-tighter">
                Check-in via <span className="text-brand-red">QR Code</span>
              </h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">{gymConfig.name}</p>
            </div>

            {/* Steps & Content */}
            <div className="py-4">
              {/* LOCATING / GPS STEP */}
              {status === 'locating' && (
                <div className="flex flex-col items-center py-6 space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-brand-red/20 blur-xl rounded-full w-16 h-16 animate-pulse"></div>
                    <div className="relative bg-brand-red/10 border border-brand-red p-4 rounded-2xl animate-bounce">
                      <MapPin className="w-8 h-8 text-brand-red" />
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-800 dark:text-white">Verificando Localização...</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                    Validando sua proximidade através do GPS para garantir que você está fisicamente no tatame.
                  </p>
                  <div className="flex items-center gap-2 text-xs font-semibold text-brand-red bg-red-50 dark:bg-brand-red/10 px-3 py-1.5 rounded-full">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Buscando coordenadas de alta precisão
                  </div>
                </div>
              )}

              {/* MATCHING CLASSES STEP */}
              {status === 'matching' && (
                <div className="flex flex-col items-center py-6 space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-brand-red/20 blur-xl rounded-full w-16 h-16 animate-pulse"></div>
                    <div className="relative bg-brand-red/10 border border-brand-red p-4 rounded-2xl">
                      <Clock className="w-8 h-8 text-brand-red animate-spin-slow" />
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-800 dark:text-white">Localização Validada!</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                    Carregando a grade de aulas de hoje para selecionar o treino adequado com base no horário.
                  </p>
                </div>
              )}

              {/* PROCESSING DB CHECKIN */}
              {status === 'loading' && (
                <div className="flex flex-col items-center py-8 space-y-4">
                  <Loader2 className="w-12 h-12 text-brand-red animate-spin" />
                  <h4 className="font-bold text-gray-800 dark:text-white">Enviando frequência...</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Salvando sua presença e liberando seu acesso.
                  </p>
                </div>
              )}

              {/* CONFIRMATION / CLASS SELECTION */}
              {status === 'confirm_class' && (
                <div className="space-y-6">
                  {selectedClass ? (
                    // Match found: Auto checkin screen
                    <div className="bg-brand-red/5 border-2 border-brand-red/20 dark:border-brand-red/30 rounded-[2rem] p-6 text-center space-y-4 relative overflow-hidden">
                      <div className="absolute -top-12 -right-12 w-24 h-24 bg-brand-red/5 rounded-full blur-[30px] pointer-events-none"></div>

                      <span className="bg-brand-red text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest inline-flex items-center gap-1">
                        <Flame className="w-3 h-3 animate-pulse" /> Aula Detectada
                      </span>
                      
                      <div className="space-y-1">
                        <h4 className="font-black text-2xl text-gray-900 dark:text-white uppercase tracking-tight leading-tight">
                          {selectedClass.name}
                        </h4>
                        <p className="font-mono text-gray-500 dark:text-gray-400 text-sm font-bold flex items-center justify-center gap-1">
                          <Clock className="w-4 h-4 text-brand-red" /> {selectedClass.time}
                        </p>
                      </div>

                      {/* Cool Countdown Circular Progress Bar style */}
                      <div className="flex flex-col items-center justify-center pt-2">
                        <div className="w-16 h-16 rounded-full border-4 border-brand-red border-t-transparent flex items-center justify-center font-black text-lg text-brand-red animate-spin-slow">
                          <span className="transform -rotate-spin text-brand-red font-display">{countdown}s</span>
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2 font-bold animate-pulse">
                          Check-in automático em andamento
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          onClick={skipCountdown}
                          className="py-3 bg-brand-red hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition"
                        >
                          <CheckCircle className="w-4 h-4" /> Confirmar Agora
                        </button>
                        <button
                          onClick={() => setSelectedClass(null)}
                          className="py-3 bg-white hover:bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-zinc-300 rounded-2xl font-semibold text-xs border border-gray-200 dark:border-gray-600 transition"
                        >
                          Trocar Horário
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Manual selection necessary on target day list
                    <div className="space-y-4">
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-left">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-0.5">Sem aula ativa correspondente</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                            Não encontramos nenhuma aula iniciando exatamente agora. Por favor, selecione para qual dos treinos de hoje você quer registrar sua presença:
                          </p>
                        </div>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
                        {classesToday.map(c => (
                          <button
                            key={c.id}
                            onClick={() => manuallySelectClass(c)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                              selectedClass?.id === c.id
                                ? 'border-brand-red bg-brand-red/5 ring-2 ring-brand-red/15'
                                : 'border-gray-100 dark:border-gray-700 hover:border-brand-red/30 hover:bg-gray-500/5 bg-gray-50/50 dark:bg-gray-900/40'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                <Clock className="w-4 h-4 text-brand-red" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-gray-800 dark:text-zinc-200 uppercase tracking-tight">{c.name}</p>
                                <p className="text-[11px] text-gray-400 font-semibold font-mono">{c.time}</p>
                              </div>
                            </div>
                            <div className={`p-1 rounded-full ${selectedClass?.id === c.id ? 'bg-brand-red text-white' : 'border border-gray-300 dark:border-gray-600 text-transparent'}`}>
                              <CheckCircle className="w-4 h-4" />
                            </div>
                          </button>
                        ))}
                      </div>

                      {selectedClass && (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => handleConfirmPresence(selectedClass)}
                          className="w-full py-3.5 bg-brand-red hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition"
                        >
                          <CheckCircle className="w-4.5 h-4.5" /> Registrar Presença em {selectedClass.time}
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SUCCESS CHECK-IN */}
              {status === 'success' && selectedClass && (
                <div className="flex flex-col items-center py-6 space-y-5 animate-scaleUp">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full w-20 h-20 animate-pulse"></div>
                    <div className="relative bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500 p-5 rounded-full text-emerald-500">
                      <CheckCircle className="w-12 h-12" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-black text-2xl text-emerald-600 dark:text-emerald-500 uppercase tracking-tight italic">Presença Registrada!</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold max-w-xs mx-auto">
                      Seu check-in foi processado de forma automática e sua vaga na aula foi validada com sucesso!
                    </p>
                  </div>

                  {/* Summary card */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 w-full text-left space-y-3">
                    <div className="flex justify-between text-xs pb-2 border-b border-gray-100 dark:border-zinc-800">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Treino / Horário</span>
                      <span className="font-bold text-gray-800 dark:text-zinc-200 uppercase">{selectedClass.name} • {selectedClass.time}</span>
                    </div>

                    <div className="flex justify-between text-xs pb-2 border-b border-gray-100 dark:border-zinc-800">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Atleta</span>
                      <span className="font-bold text-gray-800 dark:text-zinc-200 uppercase">{currentUserData.nickname || currentUserData.name}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Bônus</span>
                      <span className="font-black text-emerald-500 flex items-center gap-1 italic animate-bounce">
                        <Flame className="w-4 h-4 fill-emerald-500/10 text-emerald-500" /> Presença (+50 XP)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full py-3.5 bg-brand-dark dark:bg-zinc-700 hover:bg-black dark:hover:bg-zinc-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition"
                  >
                    Excelente, ir ao Treinar
                  </button>
                </div>
              )}

              {/* ERROR STATE */}
              {status === 'error' && (
                <div className="flex flex-col items-center py-6 space-y-5">
                  <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500/30 p-4 rounded-3xl text-red-500">
                    <ShieldAlert className="w-10 h-10" />
                  </div>
                  
                  <div className="space-y-1 max-w-sm">
                    <h4 className="font-black text-xl text-red-600 dark:text-red-500 uppercase tracking-tight">Falha na Validação</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold mt-2 bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                      {errorMessage}
                    </p>
                  </div>

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => setStatus('locating')}
                      className="flex-1 py-3.5 bg-brand-red hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg"
                    >
                      Tentar Novamente GPS
                    </button>
                    <button
                      onClick={onClose}
                      className="py-3.5 px-6 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-600 dark:text-gray-200 rounded-2xl font-semibold text-xs transition"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
