import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, getDocs, collection, query, addDoc, updateDoc, arrayUnion, where } from 'firebase/firestore';
import { 
  MapPin, Clock, CheckCircle, AlertTriangle, X, ShieldAlert, 
  CheckSquare, Loader2, Award, Zap, Trophy, Flame, FlameKindling, 
  Info, Camera, RefreshCw, Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';

interface ScanCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserData: any;
  familyMembers?: any[];
  appId: string;
  showAlert: (title: string, message: string, type: 'success' | 'error' | 'alert' | 'info') => void;
}

export default function ScanCheckinModal({ isOpen, onClose, currentUserData, familyMembers = [], appId, showAlert }: ScanCheckinModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'locating' | 'scanning' | 'matching' | 'confirm_class' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [distanceToGym, setDistanceToGym] = useState<number | null>(null);
  const [classesToday, setClassesToday] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [bookedClassIds, setBookedClassIds] = useState<string[]>([]);
  const [gymConfig, setGymConfig] = useState({
    latitude: -23.5505,
    longitude: -46.6333,
    radius: 500,
    name: "Sede Tanque Team",
    tolerance: 30
  });
  const [countdown, setCountdown] = useState(4);
  const [checkinProfile, setCheckinProfile] = useState<any>(currentUserData);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCheckinProfile(currentUserData);
    }
  }, [isOpen, currentUserData]);

  // Helper to format local date as "YYYY-MM-DD"
  const getLocalDateString = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Check check-in eligibility status for a class
  const getClassCheckinStatus = (classItem: any) => {
    if (bookedClassIds.includes(classItem.id)) {
      return 'already_booked';
    }

    if (!classItem.time) return 'unavailable';

    const [hours, mins] = classItem.time.split(':').map(Number);
    const classMinutes = hours * 60 + mins;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const tolerance = Number(gymConfig.tolerance) || 30;

    if (currentMinutes < classMinutes - tolerance) {
      return 'too_early';
    }
    if (currentMinutes > classMinutes + tolerance) {
      return 'too_late';
    }

    return 'available';
  };

  // Stop current ticking cooldown
  const stopCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // Cooldown Auto-booking starter
  const startCountdown = (classItem: any) => {
    stopCountdown();
    setCountdown(4);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          stopCountdown();
          handleConfirmPresence(classItem);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const loadBookingsForProfile = async (profileId: string) => {
    try {
      const todayString = getLocalDateString();
      const qBookings = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'bookings'),
        where('studentId', '==', profileId),
        where('date', '==', todayString)
      );
      const bookingSnap = await getDocs(qBookings);
      const bookedIds: string[] = [];
      bookingSnap.forEach(doc => {
        bookedIds.push(doc.data().classId);
      });
      setBookedClassIds(bookedIds);
      return bookedIds;
    } catch (err) {
      console.error("Error loading bookings for profile:", err);
      return [];
    }
  };

  const handleProfileChange = async (profile: any) => {
    stopCountdown();
    setCheckinProfile(profile);
    setSelectedClass(null);
    
    // Fetch bookings first
    const bookedIds = await loadBookingsForProfile(profile.id);

    // Now check if exactly 1 available class for this profile
    const availableClasses = classesToday.filter(c => {
      if (bookedIds.includes(c.id)) return false;
      if (!c.time) return false;
      const [hours, mins] = c.time.split(':').map(Number);
      const classMinutes = hours * 60 + mins;
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const tolerance = Number(gymConfig.tolerance) || 30;
      return currentMinutes >= classMinutes - tolerance && currentMinutes <= classMinutes + tolerance;
    });

    if (availableClasses.length === 1) {
      setSelectedClass(availableClasses[0]);
    } else {
      setSelectedClass(null);
    }
  };

  // Main config and dynamic data initializer
  const loadGymConfigAndBookings = async () => {
    try {
      // 1. Load gym geolocation settings and tolerance
      const gymDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'gym');
      const gymSnap = await getDoc(gymDocRef);
      let currentGymConfig = {
        latitude: -23.5505,
        longitude: -46.6333,
        radius: 500,
        name: "Sede Tanque Team",
        tolerance: 30
      };

      if (gymSnap.exists()) {
        const data = gymSnap.data();
        currentGymConfig = {
          latitude: Number(data.latitude) || -23.5505,
          longitude: Number(data.longitude) || -46.6333,
          radius: Number(data.radius) || 500,
          name: data.name ?? "Sede Tanque Team",
          tolerance: Number(data.tolerance) || 30
        };
        setGymConfig(currentGymConfig);
      }

      // 2. Load already booked classes for today
      if (currentUserData?.id) {
        await loadBookingsForProfile(currentUserData.id);
      }

      return currentGymConfig;
    } catch (err) {
      console.error("Config loader error:", err);
      return null;
    }
  };

  // Load classes available today and filter
  const loadAndMatchClasses = async (configUsed: typeof gymConfig) => {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();

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

      const sortedAll = schedule.sort((a, b) => a.time.localeCompare(b.time));
      setClassesToday(sortedAll);

      // Try matching an active class that is currently within tolerance (status === 'available')
      const availableClasses = sortedAll.filter(c => {
        const checkStatus = getClassCheckinStatus(c);
        return checkStatus === 'available';
      });

      const hasFamily = (familyMembers && familyMembers.length > 0);

      if (availableClasses.length === 1 && !hasFamily) {
        // Exactly one class is available now for check-in and no family! Let's auto-confirm
        setSelectedClass(availableClasses[0]);
        setStatus('confirm_class');
        startCountdown(availableClasses[0]);
      } else {
        // Either multiple matches, none available, or they have family (requires choosing profile)
        setStatus('confirm_class');
        setSelectedClass(availableClasses.length === 1 ? availableClasses[0] : null);
      }
    } catch (err) {
      console.error("Error loading schedules:", err);
      setStatus('error');
      setErrorMessage("Erro ao consultar a grade de horários.");
    }
  };

  // Core launcher trigger check
  useEffect(() => {
    if (!isOpen) return;

    const fetchConfigAndInitialize = async () => {
      setStatus('loading');
      const loadedConfig = await loadGymConfigAndBookings();
      const config = loadedConfig || gymConfig;

      // Check external marker trigger (e.g. from native phone camera)
      const isFromExternalScan = sessionStorage.getItem('external_scan_trigger') === 'true';
      if (isFromExternalScan) {
        sessionStorage.removeItem('external_scan_trigger');
        setStatus('matching');
        await loadAndMatchClasses(config);
      } else {
        setStatus('scanning');
      }
    };

    fetchConfigAndInitialize();

    return () => {
      stopCountdown();
    };
  }, [isOpen, appId]);

  // Handle direct GPS Proximity verify routine
  const startGpsVerification = () => {
    setStatus('locating');
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMessage("Seu celular ou navegador não possui suporte a geolocalização.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const distance = calculateDistance(latitude, longitude, gymConfig.latitude, gymConfig.longitude);
        setDistanceToGym(distance);

        if (distance > gymConfig.radius) {
          setStatus('error');
          setErrorMessage(`Você está fora da área permitida (${Math.round(distance)}m). Para confirmar sua presença via GPS, você precisa estar a menos de ${gymConfig.radius}m do tatame.`);
          return;
        }

        setStatus('matching');
        await loadAndMatchClasses(gymConfig);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setStatus('error');
        setErrorMessage("Não foi possível obter sua localização por GPS. Certifique-se de liberar as permissões de geolocalização do seu aparelho.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

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
    return R * c; 
  };

  // QR Code camera scanning reactive effect
  useEffect(() => {
    let html5QrcodeScanner: any = null;

    if (isOpen && status === 'scanning') {
      const timer = setTimeout(() => {
        try {
          html5QrcodeScanner = new Html5Qrcode("reader");
          html5QrcodeScanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (width: number, height: number) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              }
            },
            async (decodedText: string) => {
              console.log("In-app QR Scanned successful:", decodedText);
              
              if (decodedText.includes('action=scan-checkin') || decodedText.includes('scan-checkin')) {
                if (html5QrcodeScanner) {
                  try {
                    await html5QrcodeScanner.stop();
                  } catch (e) {
                    console.error("Stop camera error:", e);
                  }
                }
                
                setStatus('matching');
                await loadAndMatchClasses(gymConfig);
              } else {
                showAlert("QR Code Inválido", "O código escaneado não pertence ao QR Code oficial de check-in deste tatame.", "error");
              }
            },
            () => {
              // Continuous scanner callback, silent failures
            }
          ).catch((err: any) => {
            console.error("Camera initializer failed:", err);
          });
        } catch (e) {
          console.error("QR Code scanner initialization failed:", e);
        }
      }, 400);

      return () => {
        clearTimeout(timer);
        if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
          html5QrcodeScanner.stop().catch((e: any) => console.error("Clean camera stop clear error:", e));
        }
      };
    }
  }, [isOpen, status]);

  // Registry confirmation backend updater
  const handleConfirmPresence = async (classItem: any) => {
    stopCountdown();
    if (!classItem) return;

    // Validate rules
    const checkState = getClassCheckinStatus(classItem);
    if (checkState === 'already_booked') {
      showAlert("Check-in Duplicado", "Você já realizou o check-in para este horário de aula hoje!", "alert");
      return;
    }
    if (checkState === 'too_early') {
      showAlert("Check-in indisponível", `Você só poderá realizar o check-in ${gymConfig.tolerance} minutos antes do início desta aula.`, "alert");
      return;
    }
    if (checkState === 'too_late') {
      showAlert("Horário Expirado", "O período limite de check-in desta aula expirou. Por favor, solicite a frequência ao professor no painel.", "error");
      return;
    }

    setStatus('loading');
    try {
      const todayString = getLocalDateString(); 
      
      // 1. Add Booking document
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bookings'), {
        studentId: checkinProfile.id,
        studentName: checkinProfile.nickname || checkinProfile.name,
        studentFullName: checkinProfile.name,
        studentPhoto: checkinProfile.photoBase64 || null,
        classId: classItem.id,
        className: classItem.name,
        classTime: classItem.time,
        date: todayString,
        timestamp: new Date().toISOString()
      });

      // 2. Update Student attendance days array and attendanceLog
      const novoLog = {
        date: todayString,                      // Ex: "2026-06-22"
        time: `${classItem.time} - ${classItem.name}`, // Ex: "19:00 - Jiu-Jitsu"
        timestamp: new Date().toISOString(),
        method: "sistema_externo",              // Nome do integrador
        by: "api"
      };

      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', checkinProfile.id), {
          attendance: arrayUnion(todayString),
          attendanceLog: arrayUnion(novoLog)
        });
      } catch (err) {
        console.error("Error updating dynamic path:", err);
      }

      if (appId !== 'tanqueteam-bjj') {
        try {
          await updateDoc(doc(db, 'artifacts', 'tanqueteam-bjj', 'public', 'data', 'students', checkinProfile.id), {
            attendance: arrayUnion(todayString),
            attendanceLog: arrayUnion(novoLog)
          });
        } catch (err) {
          console.error("Error updating backup path:", err);
        }
      }

      setBookedClassIds(prev => [...prev, classItem.id]);
      setSelectedClass(classItem);
      setStatus('success');
      showAlert("Frequência Registrada", `Check-in confirmado com sucesso na aula de ${classItem.name} (${classItem.time})!`, "success");
    } catch (e) {
      console.error("Database save attendance registry error:", e);
      setStatus('error');
      setErrorMessage("Erro de persistência de dados. Não foi possível registrar a presença.");
    }
  };

  const skipCountdown = () => {
    stopCountdown();
    handleConfirmPresence(selectedClass);
  };

  const manuallySelectClass = (classItem: any) => {
    stopCountdown();
    
    const checkState = getClassCheckinStatus(classItem);
    if (checkState === 'already_booked') {
      showAlert("Check-in já Realizado", "Sua presença já está cadastrada para esta aula hoje.", "alert");
      return;
    }
    if (checkState === 'too_early') {
      showAlert("Treino Bloqueado", `Este horário ainda não está aberto. A tolerância é de ${gymConfig.tolerance} minutos antes.`, "info");
      return;
    }
    if (checkState === 'too_late') {
      showAlert("Tempo Excedido", "Sua presença não pode ser marcada por ter extrapolado o tempo limite. Solicite ao professor para marcar sua presença manualmente.", "error");
      return;
    }

    setSelectedClass(classItem);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-sans">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 max-w-lg w-full relative border border-gray-100 dark:border-gray-700/60 my-auto text-center"
          >
            {/* Close Button */}
            <button
              onClick={() => {
                stopCountdown();
                onClose();
              }}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white flex items-center justify-center text-gray-500 dark:text-gray-300 transition-all shadow-md hover:scale-110"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Banner */}
            <div className="flex flex-col items-center mb-5">
              <div className="w-12 h-1 bg-brand-red rounded-full mb-4"></div>
              <h3 className="font-display font-black text-2xl uppercase text-zinc-900 dark:text-white tracking-tighter">
                Check-in do <span className="text-brand-red">Tatame</span>
              </h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">{gymConfig.name}</p>
            </div>

            {/* Steps & Content */}
            <div className="py-2">
              {/* LOADING INITIAL CONFIG STATE */}
              {status === 'loading' && (
                <div className="flex flex-col items-center py-8 space-y-4">
                  <Loader2 className="w-10 h-10 text-brand-red animate-spin" />
                  <h4 className="font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider">Verificando regras...</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Aguarde enquanto inicializamos a conferência do tatame.
                  </p>
                </div>
              )}

              {/* CAMERA LIVE STREAM PREVIEW STEP */}
              {status === 'scanning' && (
                <div className="flex flex-col items-center py-2 space-y-4">
                  <div className="w-[280px] h-[280px] overflow-hidden rounded-[2rem] border-2 border-brand-red/40 bg-zinc-950 relative shadow-inner">
                    <div id="reader" className="w-full h-full [&>video]:object-cover overflow-hidden"></div>
                    
                    {/* Visual scanner guides */}
                    <div className="absolute inset-x-8 top-1/2 h-0.5 bg-brand-red shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse pointer-events-none"></div>
                    <div className="absolute inset-6 border border-white/20 rounded-2xl pointer-events-none border-dashed animate-pulse"></div>
                  </div>
                  
                  <div className="text-center space-y-1">
                    <h4 className="font-bold text-gray-800 dark:text-white text-xs uppercase tracking-wider">Aponte para o QR de Parede</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-gray-400 max-w-xs mx-auto">
                      Posicione a câmera em frente ao banner de check-ins impresso fixado no tatame.
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="py-2.5 px-6 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-650 dark:text-zinc-200 rounded-xl font-bold text-xs uppercase tracking-wide transition"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* LOCATING / GPS PROXIMITY VERIFIER */}
              {status === 'locating' && (
                <div className="flex flex-col items-center py-6 space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-brand-red/20 blur-xl rounded-full w-14 h-14 animate-pulse"></div>
                    <div className="relative bg-brand-red/10 border border-brand-red/30 p-3.5 rounded-2xl animate-bounce">
                      <MapPin className="w-7 h-7 text-brand-red" />
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-850 dark:text-white uppercase tracking-tight text-xs">Consultando GPS...</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                    Validando sua geolocalização por proximidade para confirmar sua presença real na academia.
                  </p>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-brand-red bg-red-50 dark:bg-brand-red/10 px-3 py-1.5 rounded-full select-none">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Validando Proximidade
                  </div>
                </div>
              )}

              {/* MATCHING TODAY'S SCHEDULES */}
              {status === 'matching' && (
                <div className="flex flex-col items-center py-8 space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-brand-red/25 blur-xl rounded-full w-14 h-14 animate-pulse"></div>
                    <div className="relative bg-brand-red/10 border border-brand-red/30 p-3 rounded-2xl">
                      <Clock className="w-7 h-7 text-brand-red animate-spin" />
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-800 dark:text-white uppercase tracking-tight text-xs">QR Code Validado!</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                    Consultando a grade de aulas de hoje para carregar suas opções de presença...
                  </p>
                </div>
              )}

              {/* CONFIRMATION / MANUAL RANGE SELECTION LIST */}
              {status === 'confirm_class' && (
                <div className="space-y-5 text-left">
                  {/* Profile Selection Bar for family members */}
                  {[currentUserData, ...(familyMembers || [])].filter(Boolean).length > 1 && (
                    <div className="bg-zinc-50 dark:bg-gray-750/30 p-3 rounded-2xl border border-gray-150 dark:border-gray-700/60 mb-1">
                      <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-2 text-center">
                        Confirmar presença para:
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                        {[currentUserData, ...(familyMembers || [])].filter(Boolean).map((p) => {
                          const isSelected = checkinProfile?.id === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => handleProfileChange(p)}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${
                                isSelected 
                                  ? 'bg-brand-red text-white scale-105' 
                                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              {p.photoBase64 ? (
                                <img 
                                  src={p.photoBase64} 
                                  alt={p.name} 
                                  className="w-4 h-4 rounded-full object-cover border border-black/10"
                                />
                              ) : (
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] uppercase font-black ${isSelected ? 'bg-white text-brand-red' : 'bg-brand-red text-white'}`}>
                                  {p.name?.charAt(0)}
                                </div>
                              )}
                              <span>{p.nickname || p.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedClass ? (
                    // Exact unique match found in window range -> countdown automatic confirm
                    <div className="bg-brand-red/5 border-2 border-brand-red/20 dark:border-brand-red/30 rounded-[2rem] p-6 text-center space-y-4 relative overflow-hidden">
                      <div className="absolute -top-12 -right-12 w-24 h-24 bg-brand-red/5 rounded-full blur-[30px] pointer-events-none"></div>

                      <span className="bg-brand-red text-white text-[9px] font-black px-3.5 py-1 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 shadow-md">
                        <Flame className="w-3.5 h-3.5 animate-pulse" /> Treino Encontrado
                      </span>
                      
                      <div className="space-y-1">
                        <h4 className="font-black text-2xl text-gray-900 dark:text-white uppercase tracking-tight leading-none italic">
                          {selectedClass.name}
                        </h4>
                        <p className="font-mono text-gray-500 dark:text-gray-400 text-sm font-bold flex items-center justify-center gap-1 mt-1.5">
                          <Clock className="w-4 h-4 text-brand-red" /> {selectedClass.time}
                        </p>
                      </div>

                      {/* Countdown Circular progress effect */}
                      <div className="flex flex-col items-center justify-center py-2.5">
                        <div className="w-16 h-16 rounded-full border-4 border-brand-red border-t-transparent flex items-center justify-center font-black text-xl text-brand-red animate-spin-slow">
                          <span className="font-display inline-block animate-pulse">{countdown}s</span>
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-3.5 font-bold animate-pulse">
                          Autenticando check-in automático...
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                          onClick={skipCountdown}
                          className="py-3 bg-brand-red hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition"
                        >
                          <CheckCircle className="w-4 h-4" /> Confirmar Já
                        </button>
                        <button
                          onClick={() => setSelectedClass(null)}
                          className="py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200 rounded-2xl font-bold text-xs border border-transparent transition"
                        >
                          Trocar Horário
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Needs selection (either multiple eligible, or outside periods)
                    <div className="space-y-4">
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-0.5">Selecione seu Horário</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal font-semibold">
                            Escolha abaixo o treino ao qual você quer marcar presença hoje. As regras de tolerância administrativa de <span className="text-brand-red font-bold">{gymConfig.tolerance} minutos</span> são checadas em tempo real:
                          </p>
                        </div>
                      </div>

                      {/* Unified list with statuses */}
                      <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
                        {classesToday.map(c => {
                          const itemStatus = getClassCheckinStatus(c);
                          const isSelectionEnabled = itemStatus === 'available';

                          return (
                            <button
                              key={c.id}
                              disabled={false} // Allow click to show explanation feedback popups!
                              onClick={() => {
                                if (itemStatus === 'already_booked') {
                                  showAlert("Presença Cadastrada", "Você já está confirmado nesta aula.", "info");
                                } else if (itemStatus === 'too_early') {
                                  showAlert("Muito Cedo", `O check-in só abre às ${c.time} (com tolerância máxima de ${gymConfig.tolerance} minutos antes).`, "info");
                                } else if (itemStatus === 'too_late') {
                                  showAlert("Horário Limite Expirado", "O período de check-in para esta aula já expirou. Por favor, solicite ao seu professor para marcar sua presença manualmente no painel.", "error");
                                } else {
                                  manuallySelectClass(c);
                                }
                              }}
                              className={`w-full text-left p-4 rounded-3xl border transition-all flex items-center justify-between ${
                                selectedClass?.id === c.id
                                  ? 'border-brand-red bg-brand-red/5 ring-2 ring-brand-red/15'
                                  : isSelectionEnabled
                                  ? 'border-gray-100 dark:border-gray-700/60 hover:border-brand-red/30 hover:bg-gray-50 dark:hover:bg-gray-750 bg-white dark:bg-gray-900/45'
                                  : 'border-gray-100 dark:border-zinc-800/60 bg-gray-50/50 dark:bg-zinc-900/20 opacity-80'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${isSelectionEnabled ? 'bg-red-50 text-brand-red' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400'}`}>
                                  <Clock className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-extrabold text-xs text-gray-800 dark:text-zinc-200 uppercase tracking-tight truncate leading-tight">{c.name}</p>
                                  <p className="text-[10px] text-gray-400 font-bold font-mono mt-0.5">{c.time}</p>
                                </div>
                              </div>

                              {/* Dynamic Status Badging */}
                              <div>
                                {itemStatus === 'already_booked' && (
                                  <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 select-none">
                                    <CheckCircle size={10} /> Presente
                                  </span>
                                )}
                                {itemStatus === 'too_early' && (
                                  <span className="text-[9px] font-extrabold text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 select-none">
                                    🕒 Bloqueado
                                  </span>
                                )}
                                {itemStatus === 'too_late' && (
                                  <span className="text-[9px] font-extrabold text-red-500 bg-red-50 dark:bg-red-950/20 px-2.5 py-1 rounded-full uppercase tracking-tight flex flex-col items-end leading-tight text-right select-none">
                                    <span>⚠️ Expirado</span>
                                    <span className="text-[7px] font-semibold text-red-400 italic">solicite ao professor</span>
                                  </span>
                                )}
                                {itemStatus === 'available' && (
                                  <div className={`p-1 rounded-full ${selectedClass?.id === c.id ? 'bg-brand-red text-white' : 'border border-gray-300 dark:border-gray-600 text-transparent'}`}>
                                    <CheckCircle className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {selectedClass && (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => handleConfirmPresence(selectedClass)}
                          className="w-full py-3.5 bg-brand-red hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition"
                        >
                          <CheckCircle className="w-4.5 h-4.5" /> Confirmar Presença às {selectedClass.time}
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SUCCESS STATE */}
              {status === 'success' && selectedClass && (
                <div className="flex flex-col items-center py-5 space-y-5 animate-scaleUp">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full w-20 h-20 animate-pulse"></div>
                    <div className="relative bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500 p-4.5 rounded-full text-emerald-500">
                      <CheckCircle className="w-11 h-11" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-black text-2xl text-emerald-600 dark:text-emerald-500 uppercase tracking-tight italic">Presença Marcada!</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold max-w-xs mx-auto leading-relaxed">
                      Seu check-in foi processado de forma automática e sua presença foi salva com sucesso no sistema!
                    </p>
                  </div>

                  {/* Summary receipt mockup */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 w-full text-left space-y-3 font-medium">
                    <div className="flex justify-between text-xs pb-2 border-b border-gray-100 dark:border-zinc-800/80">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Treino / Aula</span>
                      <span className="font-extrabold text-gray-800 dark:text-zinc-200 uppercase">{selectedClass.name}</span>
                    </div>

                    <div className="flex justify-between text-xs pb-2 border-b border-gray-100 dark:border-zinc-800/80">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Horário Treino</span>
                      <span className="font-mono font-extrabold text-gray-850 dark:text-zinc-200 uppercase">{selectedClass.time}</span>
                    </div>

                    <div className="flex justify-between text-xs pb-2 border-b border-gray-100 dark:border-zinc-800/80">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Atleta</span>
                      <span className="font-extrabold text-gray-800 dark:text-zinc-200 uppercase truncate max-w-[200px]">{checkinProfile.nickname || checkinProfile.name}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">Status Bônus</span>
                      <span className="font-black text-emerald-500 flex items-center gap-1 italic animate-bounce select-none">
                        <Flame className="w-4 h-4 fill-emerald-500/10 text-emerald-500" /> +50 XP Adquirido
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      stopCountdown();
                      onClose();
                    }}
                    className="w-full py-3.5 bg-brand-dark dark:bg-zinc-700 hover:bg-black dark:hover:bg-zinc-650 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition"
                  >
                    Maravilha! Voltar ao Início
                  </button>
                </div>
              )}

              {/* ERROR BLOCK FOR FEEDBACK */}
              {status === 'error' && (
                <div className="flex flex-col items-center py-5 space-y-5">
                  <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500/30 p-4 rounded-3xl text-red-500">
                    <ShieldAlert className="w-10 h-10" />
                  </div>
                  
                  <div className="space-y-1 max-w-sm">
                    <h4 className="font-black text-xl text-red-600 dark:text-red-500 uppercase tracking-tight">Impedimento do Tatame</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-semibold mt-2.5 bg-gray-50/50 dark:bg-zinc-900/20 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 text-left">
                      {errorMessage}
                    </p>
                  </div>

                  <div className="flex gap-3 w-full pt-1">
                    <button
                      onClick={() => setStatus('idle')}
                      className="flex-1 py-3.5 bg-brand-red hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg"
                    >
                      Tentar Novamente
                    </button>
                    <button
                      onClick={() => {
                        stopCountdown();
                        onClose();
                      }}
                      className="py-3.5 px-6 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 rounded-2xl font-semibold text-xs transition"
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
