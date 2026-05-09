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
            className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] p-6 pt-12 text-center max-w-sm w-full relative flex flex-col items-center border border-gray-100 dark:border-gray-700 my-auto"
          >
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 dark:bg-gray-700/50 backdrop-blur-md flex items-center justify-center text-gray-500 dark:text-white hover:bg-red-500 hover:text-white transition-all shadow-xl hover:scale-110 active:scale-95 z-[90] border border-white/20"
              aria-label="Fechar"
            >
              <X className="w-8 h-8" />
            </button>

            <h3 className="font-display font-black text-2xl mb-8 uppercase flex items-center justify-center gap-3 text-gray-800 dark:text-white tracking-tighter">
              <div className="w-2 h-10 bg-brand-red rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
              Identidade do Atleta
            </h3>
            
            {/* ID Card */}
            <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black rounded-[2.5rem] overflow-hidden relative shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] flex flex-col w-full max-w-[380px] mx-auto group/card border border-white/5">
              {/* Dynamic Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover/card:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>
              
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay pointer-events-none"></div>
              
              {/* Watermark Logo */}
              <div className="absolute -right-12 -bottom-12 opacity-[0.03] w-72 h-72 pointer-events-none rotate-12">
                <img src="https://iili.io/qC543c7.png" className="w-full h-full object-contain" alt="" />
              </div>

              {/* Red Accent Top */}
              <div className="h-3 w-full bg-gradient-to-r from-red-800 via-brand-red to-red-800 shadow-[0_4px_10px_rgba(0,0,0,0.3)]"></div>

              {/* Header */}
              <div className="p-4 sm:p-6 flex items-center justify-between shrink-0 relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-sm">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative h-12 w-12 sm:h-14 sm:w-14 bg-white rounded-2xl p-1.5 shadow-2xl transform -rotate-3 transition-transform group-hover/card:rotate-0">
                    <img src="https://iili.io/qC543c7.png" loading="lazy" className="w-full h-full object-contain drop-shadow-md" alt="Logo" />
                    <div className="absolute -inset-0.5 rounded-2xl border border-black/10"></div>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-display font-black text-base sm:text-lg tracking-[0.2em] sm:tracking-[0.25em] uppercase text-white drop-shadow-md leading-none italic">TANQUE TEAM</span>
                    <span className="text-[10px] sm:text-[11px] text-brand-red font-black uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
                       EST. 2012 <div className="w-1 h-1 rounded-full bg-red-900"></div> JIU-JITSU
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Body */}
              <div className="flex flex-row items-center relative z-10 p-5 sm:p-6 gap-5 sm:gap-6">
                
                {/* Photo Container with Reflection */}
                <div className="relative group/photo">
                  <div className="w-24 h-32 sm:w-32 sm:h-44 bg-zinc-800 rounded-2xl border-2 border-white/10 shadow-2xl overflow-hidden flex-shrink-0 relative z-10">
                    {userData.photoBase64 ? (
                      <img src={userData.photoBase64} loading="lazy" className="w-full h-full object-cover grayscale-[0.2] group-hover/photo:grayscale-0 transition-all duration-500" alt="Profile" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold text-5xl sm:text-6xl font-display bg-gradient-to-br from-zinc-800 to-zinc-900">
                        {userData.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Shadow inner overlay */}
                    <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] pointer-events-none"></div>
                  </div>
                  {/* Decorative Elements */}
                  <div className="absolute -left-2 -bottom-2 w-10 h-10 border-l-4 border-b-4 border-brand-red rounded-bl-xl opacity-50"></div>
                  <div className="absolute -right-2 -top-2 w-10 h-10 border-r-4 border-t-4 border-white/20 rounded-tr-xl opacity-30"></div>
                </div>
                
                {/* Info Area */}
                <div className="text-left flex-1 flex flex-col justify-center min-w-0">
                  <h4 className="font-display font-black text-xl sm:text-2xl text-white leading-tight uppercase tracking-tight drop-shadow-xl mb-4 truncate italic" title={userData.name}>{displayName}</h4>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-brand-red uppercase font-black tracking-widest mb-1">Graduação Oficial</span>
                      <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
                        <span className="text-xs sm:text-sm text-zinc-100 font-bold uppercase flex items-center gap-2 truncate">
                          {userData.belt || "Faixa Branca"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-1">ID Atleta</span>
                      <span className="text-[11px] font-mono font-bold text-zinc-400">#{userData.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Digital DNA Section (QR) */}
              <div className="bg-white p-6 sm:p-8 flex flex-col items-center justify-center relative z-10 gap-6 rounded-t-[3rem] shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
                <div className="w-full flex items-center justify-between px-2">
                  <span className="text-[10px] bg-zinc-950 text-white px-4 py-1.5 rounded-full font-black uppercase tracking-[0.2em] shadow-lg">
                    {planShort}
                  </span>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">{isBlocked ? 'BLOQUEADO' : 'ATIVO'}</span>
                  </div>
                </div>

                <div className="relative group/qr">
                  <div className="absolute -inset-4 bg-gradient-to-tr from-brand-red/10 to-transparent rounded-[2rem] blur-xl opacity-0 group-hover/qr:opacity-100 transition-opacity"></div>
                  <div className="bg-white p-4 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100 relative z-10 transition-transform group-hover/qr:scale-[1.02]">
                    {isBlocked ? (
                      <div className="flex flex-col items-center justify-center w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] text-center bg-red-50 rounded-2xl p-6 border-2 border-dashed border-red-200">
                        <Lock className="text-red-500 w-16 h-16 mb-4" />
                        <h5 className="text-sm text-red-700 font-black uppercase tracking-tight">Assinatura Pendente</h5>
                        <p className="text-[10px] text-red-500 mt-2 font-medium leading-tight opacity-70">
                          {isInactive ? "Matrícula inativa no sistema." : "Sua última mensalidade não foi identificada."}
                        </p>
                      </div>
                    ) : (
                      <QRCodeSVG value={userData.id} size={200} level="H" className="w-[160px] h-[160px] sm:w-[200px] sm:h-[200px]" />
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.3em] mb-1">Acesso Autorizado</p>
                  <p className="text-[9px] text-zinc-300 font-medium">Documento gerado pelo SIATG - Tanque Team BJJ</p>
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
              
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700/50 px-4 py-3 rounded-xl w-full">
                <Camera className="w-4 h-4 text-brand-red" /> Tire um print da tela para salvar
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
