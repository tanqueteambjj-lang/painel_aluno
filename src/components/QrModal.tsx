import { X, Lock, Printer, Camera, FileText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';

export default function QrModal({ isOpen, onClose, userData, planShort, onOpenHistory }: any) {
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

  const displayName = formatName(userData.name);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 text-center max-w-sm w-full relative flex flex-col items-center"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition text-xl z-20 bg-gray-100 dark:bg-gray-700 rounded-full p-1">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-display font-bold text-lg mb-6 uppercase flex items-center justify-center gap-2 text-gray-800 dark:text-white">
              Carteirinha Digital
            </h3>
            
            {/* ID Card */}
            <div className="bg-gradient-to-br from-zinc-900 to-black rounded-2xl overflow-hidden relative shadow-2xl flex flex-col w-full max-w-[380px] mx-auto print:shadow-none print:border print:border-gray-400">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay"></div>
              
              {/* Watermark Logo */}
              <div className="absolute -right-10 -bottom-10 opacity-5 w-64 h-64 pointer-events-none">
                <img src="https://iili.io/qC543c7.png" className="w-full h-full object-contain" alt="" />
              </div>

              {/* Red Accent Top */}
              <div className="h-2 w-full bg-gradient-to-r from-red-700 via-red-500 to-red-700"></div>

              {/* Header */}
              <div className="p-3 sm:p-4 flex items-center justify-between shrink-0 relative z-10 border-b border-zinc-800/50">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="relative h-10 w-10 sm:h-12 sm:w-12 bg-white/10 rounded-full p-1 backdrop-blur-sm border border-white/10 shrink-0">
                    <img src="https://iili.io/qC543c7.png" loading="lazy" className="w-full h-full object-contain drop-shadow-lg" alt="Logo" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-display font-black text-sm sm:text-base tracking-[0.15em] sm:tracking-[0.2em] uppercase text-white drop-shadow-md leading-none">TANQUE TEAM</span>
                    <span className="text-[9px] sm:text-[10px] text-red-500 font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-1">Jiu-Jitsu</span>
                  </div>
                </div>
              </div>
              
              {/* Body */}
              <div className="flex flex-row items-center relative z-10 p-4 sm:p-5 gap-4 sm:gap-5">
                
                {/* Photo */}
                <div className="w-24 h-32 sm:w-28 sm:h-36 bg-zinc-800 rounded-xl border-2 border-zinc-700 shadow-2xl overflow-hidden flex-shrink-0 relative">
                  {userData.photoBase64 ? (
                    <img src={userData.photoBase64} loading="lazy" className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold text-4xl sm:text-5xl font-display bg-gradient-to-br from-zinc-800 to-zinc-900">
                      {userData.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="text-left flex-1 flex flex-col justify-center min-w-0">
                  <h4 className="font-black text-lg sm:text-xl text-white leading-tight uppercase tracking-tight drop-shadow-md mb-2 sm:mb-3 truncate" title={userData.name}>{displayName}</h4>
                  
                  <div className="flex flex-col gap-2 sm:gap-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] sm:text-[9px] text-zinc-400 uppercase font-bold tracking-widest">Graduação</span>
                      <span className="text-xs sm:text-sm text-zinc-100 font-bold uppercase flex items-center gap-2 truncate">
                        {userData.belt || "Faixa Branca"}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-[8px] sm:text-[9px] text-zinc-400 uppercase font-bold tracking-widest">Plano</span>
                      <span className="text-xs sm:text-sm text-zinc-100 font-bold uppercase truncate">{planShort}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer / QR Code */}
              <div className="bg-gradient-to-b from-zinc-100 to-white p-5 flex flex-col items-center justify-center relative z-10 border-t border-zinc-200 gap-4">
                <div className="bg-white p-3 rounded-xl shadow-md border border-gray-200">
                  {isBlocked ? (
                    <div className="flex flex-col items-center justify-center w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] text-center bg-red-50 rounded-lg p-4">
                      <Lock className="text-red-500 w-12 h-12 mb-2" />
                      <p className="text-xs text-red-600 font-bold">Acesso Restrito</p>
                      <p className="text-[10px] text-red-500 mt-1 leading-tight">
                        {isInactive ? "Matrícula inativa." : "Pagamento pendente."} Procure a administração.
                      </p>
                    </div>
                  ) : (
                    <QRCodeSVG value={userData.id} size={180} level="M" className="w-[160px] h-[160px] sm:w-[180px] sm:h-[180px]" />
                  )}
                </div>

                <div className="flex flex-col items-center text-center">
                   <span className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Status da Matrícula</span>
                   {isBlocked ? (
                     <div className="flex items-center gap-1.5">
                       <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                       <span className="text-sm sm:text-base font-black text-red-600 uppercase tracking-wide">Bloqueado</span>
                     </div>
                   ) : (
                     <div className="flex items-center gap-1.5">
                       <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                       <span className="text-sm sm:text-base font-black text-green-600 uppercase tracking-wide">Ativo</span>
                     </div>
                   )}
                </div>
              </div>
            </div>

            <div className="mt-6 w-full flex flex-col items-center gap-3">
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
