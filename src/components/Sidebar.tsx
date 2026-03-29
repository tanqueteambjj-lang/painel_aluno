import { ChartLine, Users, UserCog, Moon, Sun, LogOut, X, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';

export default function Sidebar({ view, setView, isMobileMenuOpen, setIsMobileMenuOpen, toggleTheme, isDarkMode, handleLogout }: any) {
  return (
    <aside className={`fixed md:relative inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 bg-brand-dark text-white flex flex-col shadow-2xl z-40 transition-transform duration-300 ease-in-out h-full border-r border-gray-800`}>
      <div className="p-6 flex items-center justify-center border-b border-gray-800 relative">
        <div className="relative h-12 w-12 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://iili.io/qC543c7.png" alt="Logo" loading="lazy" className="w-full h-full object-contain" />
        </div>
        <span className="ml-3 font-display font-bold text-xl tracking-wider">TANQUE TEAM</span>
        <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none">
          <X className="w-6 h-6" />
        </button>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2 flex flex-col">
        <motion.button 
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView('dashboard')} 
          className={`flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left ${view === 'dashboard' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <ChartLine className="w-6 h-6" />
          <span className="font-bold ml-2">Dashboard</span>
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView('feed')} 
          className={`flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left ${view === 'feed' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <Users className="w-6 h-6" />
          <span className="ml-2">Feed da Equipe</span>
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView('profile')} 
          className={`flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left ${view === 'profile' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <UserCog className="w-6 h-6" />
          <span className="ml-2">Meus Dados</span>
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setView('finance')} 
          className={`flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left ${view === 'finance' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <CreditCard className="w-6 h-6" />
          <span className="ml-2">Financeiro</span>
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={toggleTheme} 
          className="hidden md:flex mt-auto items-center px-4 py-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors w-full text-left">
          {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          <span className="ml-2">Modo {isDarkMode ? 'Claro' : 'Noturno'}</span>
        </motion.button>
      </nav>
      <div className="p-4 border-t border-gray-800">
        <motion.button 
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout} 
          className="flex items-center w-full px-4 py-2 text-red-400 hover:text-red-300 transition-colors font-bold">
          <LogOut className="w-6 h-6" />
          <span className="ml-2">Sair do Sistema</span>
        </motion.button>
      </div>
    </aside>
  );
}
