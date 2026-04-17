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
  
  const histArray = Array.isArray(history) ? history : Object.values(history || {});
  histArray.sort((a: any, b: any) => parseDateString(b.timestamp || b.date).getTime() - parseDateString(a.timestamp || a.date).getTime());

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
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] border-t-4 border-blue-500"
            >
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-600 shrink-0">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                  <Clock className="text-blue-500 w-5 h-5" /> O Meu Histórico Financeiro
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-xl transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-0 flex-1">
                {histArray.length === 0 ? (
                  <div className="text-center py-10 flex flex-col items-center">
                    <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 italic text-sm font-medium mt-2">Nenhum pagamento registado no sistema.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left text-gray-800 dark:text-gray-200">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 shadow-sm">
                      <tr>
                        <th className="px-4 py-3 font-bold">Data</th>
                        <th className="px-4 py-3 font-bold text-right">Valor Pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {histArray.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b dark:border-gray-700">
                          <td className="px-4 py-3 font-bold text-gray-800 dark:text-gray-200">
                            {parseDateString(p.timestamp || p.date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 font-bold text-green-600 dark:text-green-400 text-right">
                            {Number(p.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0 text-right">
                <button onClick={onClose} className="px-6 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition shadow-sm">
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
