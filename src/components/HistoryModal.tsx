import { X, Clock, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import ReceiptModal from './ReceiptModal';

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
    return new Date(dateStr);
  }
  return new Date(dateStr);
};

export default function HistoryModal({ isOpen, onClose, history, userData, planShort }: any) {
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [tab, setTab] = useState<'financial' | 'xp'>('financial');
  
  const histArray = Array.isArray(history) ? history : Object.values(history || {});
  histArray.sort((a: any, b: any) => parseDateString(b.timestamp || b.date).getTime() - parseDateString(a.timestamp || a.date).getTime());

  const xpLogArray = Array.isArray(userData?.xpLog) ? [...userData.xpLog] : [];
  xpLogArray.sort((a: any, b: any) => parseDateString(b.date).getTime() - parseDateString(a.date).getTime());

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] border-b-8 border-brand-red"
            >
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-600 shrink-0">
                <h3 className="font-display font-black text-xl text-gray-900 dark:text-white flex items-center gap-2 italic uppercase">
                  Meu Histórico
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex p-1 bg-gray-100 dark:bg-gray-900/50 mx-4 mt-4 rounded-xl">
                <button 
                  onClick={() => setTab('financial')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${tab === 'financial' ? 'bg-white dark:bg-gray-800 text-brand-red shadow-sm' : 'text-gray-500'}`}
                >
                  Financeiro
                </button>
                <button 
                  onClick={() => setTab('xp')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${tab === 'xp' ? 'bg-white dark:bg-gray-800 text-brand-red shadow-sm' : 'text-gray-500'}`}
                >
                  Experiência (XP)
                </button>
              </div>

              <div className="overflow-y-auto p-4 flex-1">
                {tab === 'financial' ? (
                  histArray.length === 0 ? (
                    <div className="text-center py-10 flex flex-col items-center">
                      <FileText className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 italic text-sm font-medium">Nenhum pagamento registrado.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {histArray.map((p: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/50">
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{parseDateString(p.timestamp || p.date).toLocaleDateString('pt-BR')}</p>
                            <p className="font-bold text-gray-800 dark:text-white uppercase text-xs">Mensalidade {planShort}</p>
                          </div>
                          <p className="font-black text-green-600 dark:text-green-400">
                             {Number(p.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  xpLogArray.length === 0 ? (
                    <div className="text-center py-10 flex flex-col items-center">
                      <Clock className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 italic text-sm font-medium">Nenhuma atividade registrada ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {xpLogArray.map((entry: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/50">
                          <div className="flex-1">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{parseDateString(entry.date).toLocaleDateString('pt-BR')}</p>
                            <p className="font-bold text-gray-800 dark:text-white uppercase text-xs leading-tight">{entry.reason}</p>
                            {entry.type && (
                              <span className="text-[9px] bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500 uppercase font-black mt-1 inline-block">
                                {entry.type}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                             <p className="font-black text-brand-red italic">
                               +{entry.amount} <span className="text-[10px] not-italic">XP</span>
                             </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0 text-center">
                <button onClick={onClose} className="w-full py-3 bg-brand-red text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition shadow-xl shadow-red-500/20 italic">
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ReceiptModal 
        isOpen={!!selectedReceipt} 
        onClose={() => setSelectedReceipt(null)} 
        receiptData={selectedReceipt}
        userData={userData}
        planShort={planShort}
      />
    </>
  );
}
