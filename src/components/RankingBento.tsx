import React from 'react';
import { Trophy, Flame, MessageSquare, Star, Crown, Medal, TrendingUp, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface RankingBentoProps {
  rankings: {
    xpAdulto: any[];
    presenceAdulto: any[];
    socialAdulto: any[];
    xpInfantil: any[];
  };
  currentUserData: any;
  isAdmin?: boolean;
}

export default function RankingBento({ rankings, currentUserData, isAdmin }: RankingBentoProps) {
  const { xpAdulto, presenceAdulto, socialAdulto, xpInfantil } = rankings;

  const RankingList = ({ items, icon, title, type = 'xp' }: any) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 px-2">
        <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0">
          {icon}
        </div>
        <h3 className="font-bold text-sm dark:text-white uppercase tracking-tight">{title}</h3>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
        {items.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">Nenhum registro ainda.</p>
        ) : (
          items.slice(0, 5).map((item: any, idx: number) => {
            const isMe = item.id === (currentUserData?.id || currentUserData?.uid);
            return (
              <div 
                key={item.id} 
                className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                  isMe ? 'bg-brand-red/10 border border-brand-red/30 ring-1 ring-brand-red/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-center w-6 text-xs font-black italic text-gray-400">
                  {idx === 0 ? <Crown className="w-4 h-4 text-yellow-500" /> : idx + 1}
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 border border-gray-200 dark:border-gray-600 shadow-sm">
                  {item.photoBase64 ? (
                    <img src={item.photoBase64} className="w-full h-full object-cover" alt={item.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                      {(item.nickname || item.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${isMe ? 'text-brand-red' : 'dark:text-gray-200'}`}>
                    {idx === 0 && !isMe ? '👑 ' : ''}{isAdmin ? item.name : (item.nickname || item.name.split(' ')[0])}
                  </p>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
                    {item.belt?.replace('Faixa ', '') || 'Branca'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    type === 'xp' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    type === 'presence' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {type === 'xp' ? `${item.xp?.toLocaleString()} XP` : 
                     type === 'presence' ? `${item.classes} aulas` :
                     `${item.socialXP || 0} pts`}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 lg:gap-6">
      {/* Main Leaderboard - Overall XP */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="md:col-span-3 lg:col-span-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border-t-8 border-brand-red flex flex-col min-h-[450px]"
      >
        <RankingList 
          items={xpAdulto} 
          icon={<Crown className="w-5 h-5 text-yellow-500" />} 
          title="Conselho dos Mestres" 
          type="xp"
        />
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
           <p className="text-[10px] text-gray-400 uppercase font-bold text-center tracking-widest">Os guerreiros com maior XP acumulado</p>
        </div>
      </motion.div>

      {/* Secondary Leaderboards - Consistency & Social */}
      <div className="md:col-span-3 lg:col-span-4 space-y-4 lg:space-y-6">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border-l-4 border-orange-500 h-[calc(50%-0.5rem)] lg:h-[calc(50%-0.75rem)]"
        >
          <RankingList 
            items={presenceAdulto} 
            icon={<Flame className="w-5 h-5 text-orange-500" />} 
            title="Sempre Presente" 
            type="presence"
          />
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border-l-4 border-blue-500 h-[calc(50%-0.5rem)] lg:h-[calc(50%-0.75rem)]"
        >
          <RankingList 
            items={socialAdulto} 
            icon={<MessageSquare className="w-5 h-5 text-blue-500" />} 
            title="Lenda do Feed" 
            type="social"
          />
        </motion.div>
      </div>

      {/* Junior & Info */}
      <div className="md:col-span-6 lg:col-span-4 space-y-4 lg:space-y-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border-l-4 border-purple-500"
        >
          <RankingList 
            items={xpInfantil} 
            icon={<Users className="w-5 h-5 text-purple-600" />} 
            title="Pequenos Gigantes" 
            type="xp"
          />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-brand-dark to-gray-900 rounded-2xl shadow-2xl p-6 text-white overflow-hidden relative"
        >
          <div className="relative z-10">
            <h3 className="text-lg font-black italic uppercase mb-2 flex items-center gap-2">
              <Star className="text-yellow-400 w-5 h-5" /> Suba de Nível
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              XP é conquistado através de treinos, graduações, interação no feed e conquistas especiais. 
              Guerreiros de nível alto desbloqueiam <span className="text-yellow-400 font-bold italic">AURAS VISUAIS</span> exclusivas!
            </p>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {['Guerreiro', 'Elite', 'Lendário', 'Mítico'].map((tier, i) => (
                <div key={i} className="px-2 py-1 bg-white/10 rounded-lg text-[9px] font-black uppercase whitespace-nowrap border border-white/5">
                  {tier}
                </div>
              ))}
            </div>
          </div>
          <Crown className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 rotate-12" />
        </motion.div>
      </div>
    </div>
  );
}
