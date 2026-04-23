import { ChartLine, Users, UserCog, Moon, Sun, LogOut, X, CreditCard, Trophy } from 'lucide-react';
import { motion } from 'motion/react';

export default function Sidebar({ view, setView, isMobileMenuOpen, setIsMobileMenuOpen, toggleTheme, isDarkMode, handleLogout, hasUnreadFeed, hasUnreadNotices }: any) {
  return (
    <aside 
      className={`fixed md:relative inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 bg-brand-dark text-white flex flex-col shadow-2xl z-40 transition-transform duration-300 ease-in-out h-full border-r border-gray-800`}
      aria-label="Navegação lateral"
    >
      <div className="p-6 flex items-center justify-center border-b border-gray-800 relative">
        <div className="relative h-12 w-12 shrink-0">
          <img src="https://iili.io/qC543c7.png" alt="Logo Tanque Team BJJ" loading="lazy" className="w-full h-full object-contain" />
        </div>
        <span className="ml-3 font-display font-bold text-xl tracking-wider">TANQUE TEAM</span>
        <button 
          onClick={() => setIsMobileMenuOpen(false)} 
          className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none p-1"
          aria-label="Fechar menu lateral"
        >
          <X className="w-6 h-6" aria-hidden="true" />
        </button>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2 flex flex-col overflow-y-auto" role="navigation">
        <motion.button 
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }} 
          className={`flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left relative ${view === 'dashboard' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          aria-current={view === 'dashboard' ? 'page' : undefined}
        >
          <ChartLine className="w-6 h-6" aria-hidden="true" />
          <span className="font-bold ml-2">Dashboard</span>
          {hasUnreadNotices && (
            <span className="absolute top-3 right-4 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" aria-label="Avisos não lidos"></span>
          )}
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setView('feed'); setIsMobileMenuOpen(false); }} 
          className={`flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left relative ${view === 'feed' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          aria-current={view === 'feed' ? 'page' : undefined}
        >
          <Users className="w-6 h-6" aria-hidden="true" />
          <span className="ml-2">Feed da Equipe</span>
          {hasUnreadFeed && (
            <span className="absolute top-3 right-4 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" aria-label="Novas postagens no feed"></span>
          )}
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setView('ranking'); setIsMobileMenuOpen(false); }} 
          className={`flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left ${view === 'ranking' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          aria-current={view === 'ranking' ? 'page' : undefined}
        >
          <Trophy className="w-6 h-6" aria-hidden="true" />
          <span className="ml-2">Ranking</span>
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setView('profile'); setIsMobileMenuOpen(false); }} 
          className={`flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left ${view === 'profile' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          aria-current={view === 'profile' ? 'page' : undefined}
        >
          <UserCog className="w-6 h-6" aria-hidden="true" />
          <span className="ml-2">Meus Dados</span>
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setView('finance'); setIsMobileMenuOpen(false); }} 
          className={`flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left ${view === 'finance' ? 'bg-brand-red text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          aria-current={view === 'finance' ? 'page' : undefined}
        >
          <CreditCard className="w-6 h-6" aria-hidden="true" />
          <span className="ml-2">Financeiro</span>
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={toggleTheme} 
          className="hidden md:flex mt-auto items-center px-4 py-3 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors w-full text-left"
          aria-label={isDarkMode ? "Mudar para modo claro" : "Mudar para modo noturno"}
        >
          {isDarkMode ? <Sun className="w-6 h-6" aria-hidden="true" /> : <Moon className="w-6 h-6" aria-hidden="true" />}
          <span className="ml-2">Modo {isDarkMode ? 'Claro' : 'Noturno'}</span>
        </motion.button>
      </nav>
      <div className="p-4 border-t border-gray-800">
        <motion.button 
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout} 
          className="flex items-center w-full px-4 py-2 text-red-400 hover:text-red-300 transition-colors font-bold"
          aria-label="Sair da conta"
        >
          <LogOut className="w-6 h-6" aria-hidden="true" />
          <span className="ml-2">Sair do Sistema</span>
        </motion.button>
      </div>
    </aside>
  );
}
