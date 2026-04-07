import { X, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReceiptModal({ isOpen, onClose, receiptData, userData, planShort }: any) {
  if (!receiptData || !userData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm print:bg-white print:p-0"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full relative border-t-4 border-brand-red print:shadow-none print:border-none print:rounded-none print:text-black print:dark:bg-white"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition text-xl z-20 print:hidden">
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <img src="https://iili.io/qC543c7.png" className="w-16 h-16 object-contain" alt="Logo" />
              </div>
              <h2 className="font-display font-black text-xl uppercase tracking-widest text-gray-900 dark:text-white print:text-black">TANQUE TEAM ESCOLA DE ARTES MARCIAIS LTDA</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1 print:text-gray-600">CNPJ: 65.678.191/0001-90</p>
              <div className="mt-4 inline-block bg-gray-100 dark:bg-gray-700 px-4 py-1 rounded-full">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider print:text-gray-800">Recibo de Pagamento</p>
              </div>
            </div>
            
            <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4 mb-6 print:border-gray-300">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold print:text-gray-500">Data</p>
                  <p className="font-bold text-gray-900 dark:text-white print:text-black">{receiptData.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold print:text-gray-500">Valor</p>
                  <p className="font-black text-green-600 dark:text-green-400 text-lg print:text-black">{receiptData.amount}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 mb-8">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold print:text-gray-500">Aluno</p>
                <p className="font-bold text-gray-900 dark:text-white print:text-black">{userData.name}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold print:text-gray-500">Plano</p>
                <p className="font-bold text-gray-900 dark:text-white print:text-black">{planShort}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold print:text-gray-500">Referência</p>
                <p className="font-bold text-gray-900 dark:text-white print:text-black">Mensalidade</p>
              </div>
            </div>
            
            <div className="text-center text-xs text-gray-400 dark:text-gray-500 font-medium print:text-gray-500">
              <p>Este documento serve como comprovante de pagamento.</p>
              <p className="mt-1">Obrigado por fazer parte da Tanque Team!</p>
            </div>
            
            <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-700 text-center print:hidden">
              <button onClick={handlePrint} className="px-6 py-3 bg-brand-red text-white rounded-lg text-sm font-bold hover:bg-red-700 transition shadow-md flex items-center justify-center gap-2 w-full">
                <Printer className="w-5 h-5" /> Imprimir Recibo
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
