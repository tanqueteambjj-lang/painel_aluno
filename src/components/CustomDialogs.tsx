import { AlertTriangle, CheckCircle, Info, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';

export type AlertType = 'info' | 'success' | 'error' | 'warning';

interface ToastProps {
  isOpen: boolean;
  message: string;
  type?: AlertType;
  onClose: () => void;
}

export function Toast({ isOpen, message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const bgColors = {
    info: 'bg-blue-600',
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-amber-600'
  };

  const icons = {
    info: <Info className="w-5 h-5 text-white" />,
    success: <CheckCircle className="w-5 h-5 text-white" />,
    error: <AlertTriangle className="w-5 h-5 text-white" />,
    warning: <AlertTriangle className="w-5 h-5 text-white" />
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className={`${bgColors[type]} text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto border border-white/20`}
      >
        <div className="shrink-0">
          {icons[type]}
        </div>
        <p className="text-sm font-bold flex-1">{message}</p>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: AlertType;
  onClose: () => void;
}

export function AlertDialog({ isOpen, title, message, type = 'info', onClose }: AlertDialogProps) {
  const icons = {
    info: <Info className="w-6 h-6 text-blue-500" />,
    success: <CheckCircle className="w-6 h-6 text-green-500" />,
    error: <AlertTriangle className="w-6 h-6 text-red-500" />
  };

  const bgColors = {
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all border-t-4 ${
              type === 'info' ? 'border-blue-500' : type === 'success' ? 'border-green-500' : 'border-red-500'
            }`}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${bgColors[type]}`}>
                  {icons[type]}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-xl text-sm font-bold transition shadow-md"
                >
                  OK
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ isOpen, title, message, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all border-t-4 border-yellow-500"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <HelpCircle className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  onClick={onClose}
                  className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl text-sm font-bold transition shadow-md"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
