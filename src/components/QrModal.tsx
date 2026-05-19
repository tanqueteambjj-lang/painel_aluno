import { X, Lock, Camera, MapPin, Loader2, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function QrModal({ isOpen, onClose, userData, planShort, appId, showAlert }: any) {
  const [checkingIn, setCheckingIn] = useState(false);
  
  if (!userData) return null;

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
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(`${dateStr}T12:00:00`);
      }
      return new Date(dateStr);
    }
    return new Date(dateStr);
  };

  let isPaymentPending = false;
  const dueDateValue = userData?.dueDate || userData?.nextDueDate;
  const isFreePlan = userData?.paymentStatus === 'Isento' || userData?.plan?.toLowerCase() === 'isento' || userData?.plan?.toLowerCase() === 'dependente' || userData?.planPrice === 0;

  if (dueDateValue && !isFreePlan) {
    const dateObj = parseDateString(dueDateValue);
    if (!isNaN(dateObj.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(dateObj);
      due.setHours(0, 0, 0, 0);
      
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        isPaymentPending = true;
      }
    }
  }

  const isInactive = userData.enrollmentStatus === 'Inativo' || userData.archived;
  const isBlocked = isInactive || isPaymentPending;

  const handleProximityCheckin = async () => {
    if (!navigator.geolocation) {
      showAlert("Erro", "Geolocalização não suportada pelo navegador.", "error");
      return;
    }

    setCheckingIn(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      
      // Coordenadas da Academia (Exemplo: Sede Tanque Team)
      // Em produção, isso viria de uma config no Firestore.
      const gymLat = -23.5505; 
      const gymLng = -46.6333;
      
      // Cálculo de distância simples (Haversine)
      const R = 6371e3; // Metros
      const φ1 = latitude * Math.PI/180;
      const φ2 = gymLat * Math.PI/180;
      const Δφ = (gymLat - latitude) * Math.PI/180;
      const Δλ = (gymLng - longitude) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      // Se estiver a menos de 500m
      if (distance <= 500) {
        try {
          const today = new Date().toISOString().split('T')[0];
          
          if (userData.attendance && userData.attendance.includes(today)) {
             showAlert("Aviso", "Você já realizou check-in hoje!", "alert");
             setCheckingIn(false);
             return;
          }

          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', userData.id), {
            attendance: arrayUnion(today)
          });
          
          showAlert("Sucesso", "Check-in realizado por proximidade!", "success");
          onClose();
        } catch (e) {
          console.error(e);
          showAlert("Erro", "Falha ao processar check-in.", "error");
        }
      } else {
        showAlert("Longe demais", `Você está a ${Math.round(distance)}m da academia. Aproxime-se para validar o check-in automático.`, "error");
      }
      setCheckingIn(false);
    }, (err) => {
      console.error(err);
      showAlert("Erro", "Falha ao obter localização. Verifique as permissões.", "error");
      setCheckingIn(false);
    }, { timeout: 10000 });
  };

  const formatName = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 2) {
      return `${parts[0]} ${parts[parts.length - 1]}`;
    }
    return name;
  };

  const displayName = userData.nickname || formatName(userData.name);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] p-5 pt-10 text-center max-w-sm w-full relative flex flex-col items-center border border-white/20 my-auto"
          >
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 dark:bg-gray-700/50 backdrop-blur-md flex items-center justify-center text-gray-500 dark:text-white hover:bg-red-500 hover:text-white transition-all shadow-xl hover:scale-110 active:scale-95 z-[90] border border-white/20"
              aria-label="Fechar"
            >
              <X className="w-8 h-8" />
            </button>

            <h3 className="font-display font-black text-xl mb-4 uppercase flex items-center justify-center gap-3 text-gray-800 dark:text-white tracking-tighter">
              <div className="w-1.5 h-8 bg-brand-red rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
              Identidade Digital
            </h3>
            
            {/* ID Card */}
            <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black rounded-[2rem] overflow-hidden relative shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] flex flex-col w-full max-w-[340px] mx-auto group/card border border-white/10">
              
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay pointer-events-none"></div>
              
              {/* Watermark Logo */}
              <div className="absolute -right-8 -bottom-8 opacity-[0.03] w-56 h-56 pointer-events-none rotate-12">
                <img src="https://iili.io/qC543c7.png" className="w-full h-full object-contain" alt="" />
              </div>

              {/* Red Accent Top */}
              <div className="h-1.5 w-full bg-gradient-to-r from-red-800 via-brand-red to-red-800 shadow-[0_4px_10px_rgba(0,0,0,0.3)]"></div>

              {/* Header */}
              <div className="p-4 flex items-center justify-between shrink-0 relative z-10 bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white rounded-xl p-1.5 shadow-2xl">
                    <img src="https://iili.io/qC543c7.png" loading="lazy" className="w-full h-full object-contain" alt="Logo" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-display font-black text-sm tracking-[0.15em] uppercase text-white leading-none italic">TANQUE TEAM</span>
                    <span className="text-[9px] text-brand-red font-black uppercase tracking-[0.3em] mt-1">JIU-JITSU</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${isBlocked ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-emerald-500 text-emerald-500 bg-emerald-500/10'} uppercase tracking-widest`}>
                    {isBlocked ? 'BLOQUEADO' : 'ATIVO'}
                  </span>
                </div>
              </div>
              
              {/* Body */}
              <div className="flex flex-row items-center relative z-10 px-5 py-4 gap-4">
                {/* Photo */}
                <div className="relative shrink-0">
                  <div className="w-20 h-24 bg-zinc-800 rounded-xl border border-white/20 shadow-2xl overflow-hidden relative z-10">
                    {userData.photoBase64 ? (
                      <img src={userData.photoBase64} loading="lazy" className="w-full h-full object-cover grayscale-[0.1] hover:grayscale-0 transition-all duration-500" alt="Profile" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold text-4xl font-display bg-gradient-to-br from-zinc-800 to-zinc-900">
                        {userData.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -left-1 -bottom-1 w-6 h-6 border-l-2 border-b-2 border-brand-red rounded-bl-lg opacity-40"></div>
                </div>
                
                {/* Info Area */}
                <div className="text-left flex-1 min-w-0">
                  <h4 className="font-display font-black text-lg text-white leading-tight uppercase tracking-tight mb-2 truncate italic" title={userData.name}>{displayName}</h4>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-[8px] text-brand-red uppercase font-black tracking-widest block mb-0.5">Graduação</span>
                      <span className="text-xs text-zinc-100 font-bold uppercase truncate bg-white/5 px-2 py-0.5 rounded border border-white/10 inline-block">
                        {userData.belt || "Faixa Branca"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest block">ID Atleta</span>
                      <span className="text-[10px] font-mono font-bold text-zinc-400">#{userData.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Section */}
              <div className="bg-white px-5 py-5 flex flex-row items-center justify-between relative z-10 rounded-t-[2.5rem] shadow-[0_-10px_30px_rgba(0,0,0,0.15)]">
                <div className="flex flex-col items-start gap-2">
                  <span className="text-[9px] bg-zinc-950 text-white px-3 py-1 rounded-full font-black uppercase tracking-[0.15em]">
                    {planShort}
                  </span>
                  <div className="text-left">
                    <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-[0.2em] mb-0.5">Acesso Digital</p>
                    <p className="text-[8px] text-zinc-300 font-medium">SIATG - Tanque Team</p>
                  </div>
                </div>

                <div className="bg-white p-2 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-50">
                  {isBlocked ? (
                    <div className="flex flex-col items-center justify-center w-[80px] h-[80px] bg-red-50 rounded-xl p-1 border border-dashed border-red-200">
                      <Lock className="text-red-500 w-6 h-6" />
                      <span className="text-[6px] text-red-700 font-black uppercase mt-1">BLOQUEADO</span>
                    </div>
                  ) : (
                    <QRCodeSVG value={userData.id} size={80} level="H" className="w-[80px] h-[80px]" />
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 w-full flex flex-col items-center gap-3">
              {!isBlocked && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleProximityCheckin}
                  disabled={checkingIn}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-50"
                >
                  {checkingIn ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <MapPin className="w-5 h-5" />
                      Validar por Localização (GPS)
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
