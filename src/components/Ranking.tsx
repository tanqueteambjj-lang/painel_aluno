import { Trophy, ShieldHalf, Flame } from 'lucide-react';
import { motion } from 'motion/react';

export default function Ranking({ currentUserData, ranking }: any) {
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
    if (student.nickname) return student.nickname;
    const parts = student.name.trim().split(/\s+/);
    if (parts.length > 2) {
      return `${parts[0]} ${parts[parts.length - 1]}`;
    }
    return student.name;
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="font-display text-3xl font-bold text-brand-dark dark:text-white flex items-center gap-3">
          <Trophy className="text-yellow-500 w-8 h-8" /> Ranking Mensal
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Os 5 guerreiros que mais treinaram neste mês.</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
        <div className="space-y-4">
          {ranking.map((student: any, i: number) => {
            const beltClasses = getBeltColorClass(student.belt);
            const isDarkBelt = beltClasses.includes('text-white');
            
            return (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center justify-between p-4 rounded-xl border ${beltClasses} relative overflow-hidden`}
              >
                {i === 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-400 opacity-10 rounded-bl-full"></div>}
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${isDarkBelt ? 'bg-white/20 text-white' : i === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {i + 1}º
                  </div>
                  <div>
                    <h3 className={`font-bold ${student.name === currentUserData?.name ? 'text-brand-red' : isDarkBelt ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      {formatDisplayName(student)} {student.name === currentUserData?.name && "(Você)"}
                    </h3>
                    <p className={`text-xs flex items-center mt-1 ${isDarkBelt ? 'text-zinc-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      <ShieldHalf className="w-3 h-3 mr-1" /> {student.belt}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end relative z-10">
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${isDarkBelt ? 'bg-white/20' : 'bg-brand-red/10'}`}>
                    <Flame className={`w-4 h-4 ${isDarkBelt ? 'text-white' : 'text-brand-red'}`} />
                    <span className={`font-bold ${isDarkBelt ? 'text-white' : 'text-brand-red'}`}>{student.classes}</span>
                  </div>
                  <span className={`text-[10px] uppercase mt-1 ${isDarkBelt ? 'text-zinc-400' : 'text-gray-400'}`}>Treinos</span>
                </div>
              </motion.div>
            );
          })}
          
          {ranking.length === 0 && (
            <div className="text-center py-10">
              <Trophy className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Nenhum treino registrado este mês ainda. Seja o primeiro!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
