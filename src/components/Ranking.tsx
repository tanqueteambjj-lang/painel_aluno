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

        {/* MANUAL BUTTON */}
        <div className="flex gap-2">
           <button 
             onClick={() => {
               const el = document.getElementById('ranking-manual');
               if (el) el.scrollIntoView({ behavior: 'smooth' });
             }}
             className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 transition-colors"
           >
              <Star size={14} /> Como Funciona?
           </button>
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

      {/* RANKING MANUAL SECTION */}
      <div id="ranking-manual" className="mt-12 space-y-8 scroll-mt-24">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-display font-black dark:text-white uppercase tracking-wider">Manual do Guerreiro</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Entenda como conquistar o topo da academia.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-brand-red">
              <Flame size={24} />
            </div>
            <h4 className="font-bold dark:text-white">Ranking de Treinos</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Baseado na sua constância. Cada vez que você marca presença e treina, seu contador sobe.
            </p>
            <ul className="text-xs space-y-2 text-gray-400 font-medium">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-brand-red"></div>
                O ranking reinicia internamente todo mês para definir o Top 5.
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-brand-red"></div>
                O Top 5 do mês anterior ganha <span className="text-yellow-500 font-bold">XP BÔNUS</span> para subir de nível mais rápido.
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl flex items-center justify-center text-yellow-600">
              <Star size={24} />
            </div>
            <h4 className="font-bold dark:text-white">Ranking de Nível (XP)</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Reflete sua jornada total na academia. O XP nunca reseta.
            </p>
            <div className="space-y-3">
               <p className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Como ganhar XP:</p>
               <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-bold dark:text-white">+50 XP</p>
                    <p className="text-[8px] text-gray-400 uppercase">Por Aula</p>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-bold dark:text-white">+200 XP</p>
                    <p className="text-[8px] text-gray-400 uppercase">Por Conquista</p>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-bold dark:text-white">+200-1000 XP</p>
                    <p className="text-[8px] text-gray-400 uppercase">Top 5 Mensal</p>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-bold dark:text-white">Variável</p>
                    <p className="text-[8px] text-gray-400 uppercase">XP Extra (Adm)</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="bg-brand-dark dark:bg-black p-8 rounded-[2.5rem] text-white overflow-hidden relative">
           <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
              <Trophy size={140} />
           </div>
           <div className="relative z-10 max-w-lg">
             <h4 className="text-xl font-bold mb-3 italic uppercase italic">O Top 5 e o Futuro</h4>
             <p className="text-sm text-gray-400 leading-relaxed">
               Ser Top 5 da Tanque Team não é apenas sobre o bônus de XP. É sobre reconhecimento, disciplina e servir de exemplo para os novos alunos.
             </p>
             <div className="mt-6 flex items-center gap-4">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-brand-dark"></div>
                  <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-brand-dark"></div>
                  <div className="w-8 h-8 rounded-full bg-amber-600 border-2 border-brand-dark"></div>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Mantenha a chama acesa. Oss!</p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

