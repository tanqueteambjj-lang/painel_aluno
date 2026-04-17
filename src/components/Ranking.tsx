import { Trophy, ShieldHalf, Flame } from 'lucide-react';
import { motion } from 'motion/react';

export default function Ranking({ currentUserData, ranking }: any) {
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
          {ranking.map((student: any, i: number) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center justify-between p-4 rounded-xl border ${i === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/50' : i === 1 ? 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600' : i === 2 ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/50' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'} relative overflow-hidden`}
            >
              {i === 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-400 opacity-10 rounded-bl-full"></div>}
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${i === 0 ? 'bg-yellow-100 text-yellow-600' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                  {i + 1}º
                </div>
                <div>
                  <h3 className={`font-bold ${student.name === currentUserData?.name ? 'text-brand-red' : 'text-gray-900 dark:text-white'}`}>{student.name} {student.name === currentUserData?.name && "(Você)"}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                    <ShieldHalf className="w-3 h-3 mr-1" /> {student.belt}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end relative z-10">
                <div className="flex items-center gap-1 bg-brand-red/10 px-3 py-1 rounded-full">
                  <Flame className="w-4 h-4 text-brand-red" />
                  <span className="font-bold text-brand-red">{student.classes}</span>
                </div>
                <span className="text-[10px] text-gray-400 uppercase mt-1">Treinos</span>
              </div>
            </motion.div>
          ))}
          
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
