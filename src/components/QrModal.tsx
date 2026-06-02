import { X, Lock, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '@/lib/firebase';
import { doc } from 'firebase/firestore';

export default function QrModal({ isOpen, onClose, userData, planShort, appId, showAlert }: any) {
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
            className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] p-6 pt-10 text-center max-w-md w-full relative flex flex-col items-center border border-white/20 my-auto"
          >
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 dark:bg-gray-700/50 backdrop-blur-md flex items-center justify-center text-gray-500 dark:text-white hover:bg-red-500 hover:text-white transition-all shadow-xl hover:scale-110 active:scale-95 z-[90] border border-white/20"
              aria-label="Fechar"
            >
              <X className="w-8 h-8" />
            </button>

            <h3 className="font-display font-black text-2xl mb-6 uppercase flex items-center justify-center gap-3 text-gray-800 dark:text-white tracking-tighter">
              <div className="w-1.5 h-8 bg-brand-red rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
              Identidade Digital
            </h3>
            
            {/* ID Card */}
            <div className="bg-gradient-to-br from-zinc-950 via-zinc-900 to-black rounded-[2.5rem] overflow-hidden relative shadow-[0_24px_48px_rgba(0,0,0,0.45)] flex flex-col w-full max-w-[370px] mx-auto group/card border border-white/10 scale-100">
              
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay pointer-events-none"></div>
              
              {/* Red Accent Top */}
              <div className="h-1.5 w-full bg-gradient-to-r from-red-800 via-brand-red to-red-800"></div>

              {/* Header */}
              <div className="px-5 py-4 flex items-center justify-between shrink-0 relative z-10 bg-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 bg-white rounded-lg p-1 shadow-xl flex items-center justify-center shrink-0">
                    <img src="https://iili.io/qC543c7.png" loading="lazy" className="w-full h-full object-contain" alt="Logo" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-display font-black text-xs tracking-[0.1em] uppercase text-white leading-none italic">TANQUE TEAM</span>
                    <span className="text-[8px] text-brand-red font-black uppercase tracking-[0.2em] mt-0.5">JIU-JITSU</span>
                  </div>
                </div>
                <span className={`text-[8px] font-black px-2.5 py-1 rounded-full border ${isBlocked ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-emerald-500 text-emerald-500 bg-emerald-500/10'} uppercase tracking-widest`}>
                  {isBlocked ? 'BLOQUEADO' : 'ATIVO'}
                </span>
              </div>
              
              {/* Body */}
              <div className="flex flex-row items-center relative z-10 px-5 py-4 gap-4">
                {/* Photo */}
                <div className="w-20 h-24 bg-zinc-800 rounded-xl border border-white/10 shadow-xl overflow-hidden shrink-0">
                  {userData.photoBase64 ? (
                    <img src={userData.photoBase64} loading="lazy" className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500" alt="Profile" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold text-3xl font-display bg-gradient-to-br from-zinc-800 to-zinc-900">
                      {userData.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                {/* Info Area */}
                <div className="text-left flex-1 min-w-0">
                  <h4 className="font-display font-black text-lg text-white leading-tight uppercase tracking-tight mb-2 truncate italic" title={userData.name}>{displayName}</h4>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-[8px] text-brand-red uppercase font-black tracking-widest block mb-0.5">Graduação</span>
                      <span className="text-xs text-zinc-100 font-bold uppercase truncate bg-white/5 px-2.5 py-0.5 rounded border border-white/10 inline-block max-w-full">
                        {userData.belt || "Faixa Branca"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest block">ID Atleta</span>
                      <span className="text-xs font-mono font-bold text-zinc-400">#{userData.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Section */}
              <div className="bg-white px-5 py-5 flex flex-row items-center justify-between relative z-10 rounded-t-[1.5rem] mt-1 shadow-2xl">
                <div className="flex flex-col items-start gap-1.5">
                  <span className="text-[9px] bg-zinc-950 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                    {planShort}
                  </span>
                  <div className="text-left">
                    <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-[0.1em]">Acesso Digital</p>
                    <p className="text-[8px] text-zinc-300 font-medium font-sans">SIATG - Tanque Team</p>
                  </div>
                </div>

                <div className="bg-white p-2 rounded-xl shadow-lg border border-gray-50 flex items-center justify-center">
                  {isBlocked ? (
                    <div className="flex flex-col items-center justify-center w-[76px] h-[76px] bg-red-50 rounded-lg p-1 border border-dashed border-red-200">
                      <Lock className="text-red-500 w-6 h-6" />
                      <span className="text-[7px] text-red-700 font-black uppercase mt-1 text-center">BLOQUEADO</span>
                    </div>
                  ) : (
                    <QRCodeSVG value={userData.id} size={76} level="H" className="w-[76px] h-[76px]" />
                  )}
                </div>
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
