import { Trophy, ShieldHalf, Flame, Star } from 'lucide-react';
import { motion } from 'motion/react';

export default function Ranking({ currentUserData, ranking, lastMonthRanking, isAdmin, title, subtitle, activeTab, onTabChange }: any) {
  const getBeltColorClass = (belt: string) => {
    const b = belt?.toLowerCase() || '';
    if (b.includes('preta')) return 'bg-zinc-900 border-zinc-700 text-white';
    if (b.includes('marrom') || b.includes('castanha')) return 'bg-amber-900 border-amber-800 text-white';
    if (b.includes('roxa')) return 'bg-purple-900 border-purple-800 text-white';
    if (b.includes('azul')) return 'bg-blue-900 border-blue-800 text-white';
    if (b.includes('verde')) return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
    if (b.includes('laranja')) return 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
    if (b.includes('amarela')) return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
    if (b.includes('cinza')) return 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600';
    return 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700';
  };

  const formatDisplayName = (student: any) => {
    if (isAdmin) return student.name || 'Aluno';
    if (student.nickname) return student.nickname;
    const name = student.name || 'Aluno';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 2) {
      return `${parts[0]} ${parts[parts.length - 1]}`;
    }
    return name;
  };

  return (
    <div className="max-w-4xl mx-auto pb-4">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-brand-dark dark:text-white flex items-center gap-3">
            <Trophy className="text-yellow-500 w-7 h-7 md:w-8 md:h-8" /> {title || "Hall da Fama"}
          </h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle || "Reconhecimento pela sua dedicação e técnica."}</p>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shrink-0">
          <button 
            onClick={() => onTabChange && onTabChange('presence')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'presence' ? 'bg-white dark:bg-gray-700 text-brand-red shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
          >
            Treinos
          </button>
          <button 
            onClick={() => onTabChange && onTabChange('xp')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'xp' ? 'bg-white dark:bg-gray-700 text-brand-red shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
          >
            Nível
          </button>
        </div>
      </div>
      
      {/* CAMPEÕES DO MÊS PASSADO */}
      {lastMonthRanking && lastMonthRanking.length > 0 && activeTab === 'presence' && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Star className="text-yellow-500 w-5 h-5 fill-yellow-500" />
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">Campeões do Mês Passado</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {lastMonthRanking.slice(0, 5).map((student: any, i: number) => (
              <motion.div 
                key={`last-${student.id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center text-center relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 p-1.5 rounded-bl-xl font-black text-[10px] ${
                  i === 0 ? 'bg-yellow-400 text-yellow-900' : 
                  i === 1 ? 'bg-gray-300 text-gray-700' : 
                  i === 2 ? 'bg-amber-600 text-white' : 
                  'bg-gray-100 dark:bg-gray-700 text-gray-500'
                }`}>
                  {i + 1}º
                </div>
                <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden mb-2 border-2 border-white dark:border-gray-700 shadow-sm">
                  {student.photoBase64 ? <img src={student.photoBase64} className="w-full h-full object-cover" /> : <Star className="p-3 text-gray-300" />}
                </div>
                <p className="font-bold text-[11px] truncate w-full dark:text-white">{formatDisplayName(student)}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{student.classes} Treinos</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {ranking.map((student: any, i: number) => {
            const beltClasses = getBeltColorClass(student.belt);
            const isDarkBelt = beltClasses.includes('text-white');
            const isSelf = student.id === currentUserData?.id;
            
            return (
              <motion.div 
                key={student.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center justify-between p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all ${isSelf ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 border-2 ${
                    i === 0 ? 'bg-yellow-400 border-yellow-200 text-yellow-900' : 
                    i === 1 ? 'bg-stone-300 border-stone-200 text-stone-700' : 
                    i === 2 ? 'bg-amber-600 border-amber-500 text-amber-50' : 
                    'bg-gray-100 dark:bg-gray-700 border-transparent text-gray-500 dark:text-gray-400'
                  }`}>
                    {i + 1}º
                  </div>
                  <div className="flex items-center gap-3">
                    {student.photoBase64 && (
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-white dark:border-gray-700 hidden sm:block">
                        <img src={student.photoBase64} className="w-full h-full object-cover" alt="" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold text-sm sm:text-base ${isSelf ? 'text-brand-red' : 'text-gray-900 dark:text-white'}`}>
                          {formatDisplayName(student)}
                        </h3>
                        {isSelf && <span className="bg-brand-red text-white text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Você</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded border border-transparent ${beltClasses}`}>
                          {student.belt}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  {activeTab === 'xp' ? (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5">
                         <span className="text-[10px] font-black text-brand-red tracking-widest uppercase">Nível</span>
                         <span className="text-lg font-black dark:text-white">{student.level || 1}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold -mt-1">{student.xp || 0} XP</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-brand-red" />
                        <span className="text-lg font-black dark:text-white">{student.classes}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest -mt-1">Treinos</span>
                        {i < 5 && (
                          <motion.span 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[9px] font-black px-1.5 py-0.5 rounded mt-1 uppercase tracking-tighter"
                          >
                            +{(5 - i) * 200} XP BÔNUS
                          </motion.span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          
          {ranking.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum guerreiro rankeado ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

