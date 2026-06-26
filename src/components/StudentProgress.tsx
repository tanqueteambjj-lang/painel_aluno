import React, { useState } from 'react';
import { 
  Calendar, 
  Award, 
  TrendingUp, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  Trophy, 
  FileText,
  User,
  Zap,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudentProgressProps {
  activeUserData: any;
  renderBeltSVG: (beltStr: string) => React.ReactNode;
  userLevel?: number;
  userXP?: number;
}

export default function StudentProgress({ activeUserData, renderBeltSVG, userLevel, userXP }: StudentProgressProps) {
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'notes'>('attendance');

  // 1. Enrollment date
  const getEnrollmentDate = () => {
    const rawDate = activeUserData?.registrationDate || activeUserData?.createdAt;
    if (!rawDate) return 'Não cadastrada';

    try {
      // If rawDate is firestore timestamp
      if (rawDate && typeof rawDate === 'object' && 'seconds' in rawDate) {
        const dateObj = new Date(rawDate.seconds * 1000);
        return dateObj.toLocaleDateString('pt-BR');
      }

      // If rawDate is string e.g. YYYY-MM-DD or ISO string
      const dateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : '';
      if (dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
      }
      return new Date(rawDate).toLocaleDateString('pt-BR');
    } catch (e) {
      console.error("Error formatting registration date", e);
      return String(rawDate);
    }
  };

  // 2. Attendance history (dates)
  const attendanceDates: string[] = Array.isArray(activeUserData?.attendance) 
    ? [...activeUserData.attendance].sort((a, b) => b.localeCompare(a)) 
    : [];

  const attendanceLogs: any[] = Array.isArray(activeUserData?.attendanceLog)
    ? [...activeUserData.attendanceLog].sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA);
      })
    : [];

  // Helper to get formatted day of the week and full date
  const formatAttendanceDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      
      const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

      return {
        weekday: weekdays[date.getDay()],
        formatted: `${day} de ${months[month - 1]} de ${year}`,
        short: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
      };
    } catch (e) {
      return { weekday: 'Treino', formatted: dateStr, short: dateStr };
    }
  };

  // 3. Merging Teacher Notes / Technical Progress History
  // We'll support both progressHistory (from other admin panels) and progressLog (from this system)
  const getMergedProgressHistory = () => {
    const list: any[] = [];
    const seenKeys = new Set<string>();

    const parseTextAndInstructor = (rawText: string, defaultInstructor: string) => {
      if (!rawText) return { parsedText: '', parsedInstructor: defaultInstructor };

      // 1. Try splitting by last ", " or ","
      const lastCommaIndex = rawText.lastIndexOf(',');
      if (lastCommaIndex !== -1) {
        const textPart = rawText.substring(0, lastCommaIndex).trim();
        const authorPart = rawText.substring(lastCommaIndex + 1).trim();
        const upperAuthor = authorPart.toUpperCase();
        const commonTitles = ['MESTRE', 'PROFESSOR', 'PROF', 'COACH', 'SENSEI', 'INSTRUTOR', 'SALES', 'ALUNO', 'SILVA'];
        const hasTitle = commonTitles.some(title => upperAuthor.includes(title));
        
        if (authorPart.length > 0 && authorPart.length < 35 && (hasTitle || /^[A-Z\s]+$/.test(authorPart))) {
          const finalInst = (defaultInstructor === 'Sistema' || defaultInstructor === 'Professor' || !defaultInstructor) ? authorPart : defaultInstructor;
          return { parsedText: textPart, parsedInstructor: finalInst };
        }
      }

      // 2. Try splitting by " - "
      const lastDashIndex = rawText.lastIndexOf(' - ');
      if (lastDashIndex !== -1) {
        const textPart = rawText.substring(0, lastDashIndex).trim();
        const authorPart = rawText.substring(lastDashIndex + 3).trim();
        const upperAuthor = authorPart.toUpperCase();
        const commonTitles = ['MESTRE', 'PROFESSOR', 'PROF', 'COACH', 'SENSEI', 'INSTRUTOR', 'SALES', 'ALUNO', 'SILVA'];
        const hasTitle = commonTitles.some(title => upperAuthor.includes(title));
        
        if (authorPart.length > 0 && authorPart.length < 35 && (hasTitle || /^[A-Z\s]+$/.test(authorPart))) {
          const finalInst = (defaultInstructor === 'Sistema' || defaultInstructor === 'Professor' || !defaultInstructor) ? authorPart : defaultInstructor;
          return { parsedText: textPart, parsedInstructor: finalInst };
        }
      }

      // 3. Try splitting by case-insensitive " por "
      const porRegex = /\s+por\s+/i;
      const match = rawText.match(porRegex);
      if (match && match.index !== undefined) {
        const textPart = rawText.substring(0, match.index).trim();
        const authorPart = rawText.substring(match.index + match[0].length).trim();
        if (authorPart.length > 0 && authorPart.length < 35) {
          const finalInst = (defaultInstructor === 'Sistema' || defaultInstructor === 'Professor' || !defaultInstructor) ? authorPart : defaultInstructor;
          return { parsedText: textPart, parsedInstructor: finalInst };
        }
      }

      return { parsedText: rawText, parsedInstructor: defaultInstructor };
    };

    // Parse progressHistory
    const rawProgressHistory = activeUserData?.progressHistory || [];
    if (Array.isArray(rawProgressHistory)) {
      rawProgressHistory.forEach((item: any, idx) => {
        if (!item) return;
        const date = item.date || item.timestamp || '';
        const rawText = item.text || item.note || item.comment || item.description || '';
        const uniqueKey = `history-${date}-${rawText}-${idx}`;
        if (!seenKeys.has(uniqueKey) && rawText) {
          seenKeys.add(uniqueKey);

          // author contains the name of the professor or admin who inserted the annotation.
          // Otherwise, check other fields or default to 'Sistema'.
          const defaultInst = item.author || item.instructor || item.teacher || item.professor || item.by || 'Sistema';
          const { parsedText, parsedInstructor } = parseTextAndInstructor(rawText, defaultInst);

          list.push({
            ...item,
            id: uniqueKey,
            date: date,
            text: parsedText,
            instructor: parsedInstructor,
            type: item.type || 'evaluation',
            title: item.title || 'Avaliação Técnica'
          });
        }
      });
    }

    // Parse progressLog
    const rawProgressLog = activeUserData?.progressLog || [];
    if (Array.isArray(rawProgressLog)) {
      rawProgressLog.forEach((item: any, idx) => {
        if (!item) return;
        const date = item.date || item.timestamp || '';
        const rawText = item.text || item.note || item.comment || '';
        const uniqueKey = `log-${date}-${rawText}-${idx}`;
        if (!seenKeys.has(uniqueKey) && rawText) {
          seenKeys.add(uniqueKey);

          // author contains the name of the professor or admin who inserted the annotation.
          // Otherwise, check other fields or default to 'Sistema'.
          const defaultInst = item.author || item.instructor || item.teacher || item.professor || item.by || 'Sistema';
          const { parsedText, parsedInstructor } = parseTextAndInstructor(rawText, defaultInst);

          list.push({
            ...item,
            id: uniqueKey,
            date: date,
            text: parsedText,
            instructor: parsedInstructor,
            type: item.type || 'graduation',
            title: item.type === 'graduation' ? 'Graduação de Faixa' : 'Anotação do Professor'
          });
        }
      });
    }

    // Sort by date descending (most recent first)
    return list.sort((a, b) => {
      // Handle different date formats (e.g. DD/MM/YYYY vs YYYY-MM-DD or standard strings)
      const parseDateToComparable = (dStr: string) => {
        if (!dStr) return 0;
        if (dStr.includes('-')) {
          return new Date(dStr).getTime() || 0;
        }
        if (dStr.includes('/')) {
          const [day, month, year] = dStr.split('/').map(Number);
          return new Date(year, month - 1, day).getTime() || 0;
        }
        return new Date(dStr).getTime() || 0;
      };

      return parseDateToComparable(b.date) - parseDateToComparable(a.date);
    });
  };

  const progressEvents = getMergedProgressHistory();

  // Training streaks calculation
  const calculateCurrentStreak = () => {
    if (attendanceDates.length === 0) return 0;
    
    // Get local date as string (YYYY-MM-DD)
    const getLocalDateStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = getLocalDateStr(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    // If they haven't trained today or yesterday, streak is 0
    if (!attendanceDates.includes(todayStr) && !attendanceDates.includes(yesterdayStr)) {
      return 0;
    }

    let streak = 0;
    const checkDate = new Date();
    
    // If they didn't train today but did yesterday, start checking from yesterday
    if (!attendanceDates.includes(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = getLocalDateStr(checkDate);
      if (attendanceDates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const currentStreak = calculateCurrentStreak();

  return (
    <div className="space-y-6">
      {/* 1. Header Hero Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-150 dark:border-zinc-800 p-6 md:p-8 relative overflow-hidden">
        {/* Decorative background grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          {/* Avatar/Photo */}
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-brand-red/20 dark:border-brand-red/40 overflow-hidden shadow-md shrink-0 bg-gray-100 dark:bg-gray-750 flex items-center justify-center">
            {activeUserData?.photoBase64 ? (
              <img 
                src={activeUserData.photoBase64} 
                alt={activeUserData.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            )}
          </div>

          {/* Student Profile Info */}
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
              <h3 className="font-display text-2xl md:text-3xl font-black text-brand-dark dark:text-white uppercase tracking-tight">
                {activeUserData?.nickname || activeUserData?.name || "Atleta"}
              </h3>
              {activeUserData?.role === 'admin' && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 w-fit mx-auto md:mx-0">
                  Professor / Admin
                </span>
              )}
            </div>

            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {activeUserData?.belt || "Faixa Branca - 0º Grau"}
            </p>

            {/* Belt render */}
            <div className="w-48 h-8 rounded border border-black/15 shadow-sm overflow-hidden mx-auto md:mx-0 mt-2 bg-zinc-100 dark:bg-zinc-900">
              {renderBeltSVG(activeUserData?.belt || "Faixa Branca - 0º Grau")}
            </div>
          </div>

          {/* Quick Streaks & Belt Info */}
          <div className="flex flex-wrap justify-center gap-3 md:justify-end">
            <div className="bg-orange-500/10 dark:bg-orange-500/5 border border-orange-500/20 px-4 py-3 rounded-xl text-center">
              <p className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400 tracking-widest">
                Sequência Atual
              </p>
              <div className="flex items-center justify-center gap-1 mt-1 text-orange-600 dark:text-orange-400 font-black">
                <Zap className="w-5 h-5 fill-current animate-pulse" />
                <span className="text-2xl">{currentStreak}</span>
                <span className="text-xs font-bold uppercase tracking-wider">dias</span>
              </div>
            </div>

            <div className="bg-brand-red/10 dark:bg-brand-red/5 border border-brand-red/20 px-4 py-3 rounded-xl text-center">
              <p className="text-[10px] font-black uppercase text-brand-red dark:text-brand-red tracking-widest">
                Total de Aulas
              </p>
              <div className="flex items-center justify-center gap-1 mt-1 text-brand-red font-black">
                <Trophy className="w-5 h-5" />
                <span className="text-2xl">{attendanceDates.length}</span>
                <span className="text-xs font-bold uppercase tracking-wider">Treinos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-150 dark:border-zinc-800/80 text-sm">
          <div className="flex items-center justify-center sm:justify-start gap-2.5 text-gray-600 dark:text-gray-300">
            <Calendar className="w-4.5 h-4.5 text-brand-red shrink-0" />
            <div>
              <span className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Data de Matrícula
              </span>
              <span className="font-bold text-gray-800 dark:text-zinc-200">
                {getEnrollmentDate()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-2.5 text-gray-600 dark:text-gray-300">
            <Award className="w-4.5 h-4.5 text-brand-red shrink-0" />
            <div>
              <span className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Graus Atuais
              </span>
              <span className="font-bold text-gray-800 dark:text-zinc-200">
                {activeUserData?.belt?.match(/(\d)º/) ? `${activeUserData.belt.match(/(\d)º/)[1]}º Grau` : '0º Grau'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-2.5 text-gray-600 dark:text-gray-300">
            <TrendingUp className="w-4.5 h-4.5 text-brand-red shrink-0" />
            <div>
              <span className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Nível do Atleta
              </span>
              <span className="font-bold text-gray-800 dark:text-zinc-200">
                Nível {userLevel !== undefined ? userLevel : (Math.floor(Math.sqrt((activeUserData?.extraXP || 0) / 100)) + 1)}
                {userXP !== undefined && <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">({userXP} XP)</span>}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Selection Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700/80 gap-6">
        <button
          onClick={() => setActiveSubTab('attendance')}
          className={`pb-3 text-sm font-black uppercase tracking-wider transition-all relative shrink-0 ${
            activeSubTab === 'attendance'
              ? 'text-brand-red font-black'
              : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <span>Histórico de Presenças</span>
          {activeSubTab === 'attendance' && (
            <motion.div 
              layoutId="activeSubTabIndicator" 
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" 
            />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('notes')}
          className={`pb-3 text-sm font-black uppercase tracking-wider transition-all relative shrink-0 flex items-center gap-1.5 ${
            activeSubTab === 'notes'
              ? 'text-brand-red font-black'
              : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <span>Evolução & Notas do Professor</span>
          {progressEvents.length > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-black bg-brand-red text-white">
              {progressEvents.length}
            </span>
          )}
          {activeSubTab === 'notes' && (
            <motion.div 
              layoutId="activeSubTabIndicator" 
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" 
            />
          )}
        </button>
      </div>

      {/* 3. Content Panel */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'attendance' ? (
          <motion.div
            key="attendance-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {attendanceDates.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-150 dark:border-zinc-800">
                <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h4 className="text-gray-700 dark:text-zinc-300 font-bold uppercase tracking-tight text-sm">
                  Nenhum treino registrado
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  Sua frequência será mostrada aqui assim que você realizar o primeiro check-in de aula.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Attendance Timeline List */}
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="text-xs font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest flex items-center gap-1.5 mb-2">
                    <Clock className="w-3.5 h-3.5 text-brand-red" />
                    Aulas assistidas mais recentes
                  </h4>

                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                    {attendanceDates.map((dateStr, idx) => {
                      const details = formatAttendanceDate(dateStr);
                      // Search inside attendanceLogs for a matches on this date
                      const logsOnThisDate = attendanceLogs.filter(l => l?.date === dateStr);
                      
                      return (
                        <div 
                          key={idx} 
                          className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-150 dark:border-zinc-800/80 shadow-sm flex items-center justify-between hover:border-gray-300 dark:hover:border-gray-700 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-red/10 flex items-center justify-center shrink-0">
                              <CheckCircle className="w-5 h-5 text-brand-red" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                {details.weekday}
                              </p>
                              <h5 className="font-bold text-gray-800 dark:text-zinc-200 text-sm">
                                {details.formatted}
                              </h5>
                              
                              {/* If there is specific class time info logged */}
                              {logsOnThisDate.length > 0 ? (
                                <div className="mt-1 flex flex-col gap-0.5">
                                  {logsOnThisDate.map((log, logIdx) => (
                                    <span key={logIdx} className="inline-flex items-center text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase bg-gray-100 dark:bg-gray-750 px-2 py-0.5 rounded mt-0.5">
                                      {log.time || 'Presença Confirmada'}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="inline-block mt-1 text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase">
                                  Check-in Presencial
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500">
                              {details.short}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Training Stats / Summary Box */}
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-zinc-800 shadow-sm">
                    <h4 className="text-xs font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest mb-3">
                      Distribuição Mensal
                    </h4>

                    {/* Simple summary counts by Month */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {(() => {
                        const monthCounts: Record<string, number> = {};
                        const monthsNames = [
                          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                        ];

                        attendanceDates.forEach(dateStr => {
                          try {
                            const [year, month] = dateStr.split('-');
                            const label = `${monthsNames[parseInt(month) - 1]} / ${year}`;
                            monthCounts[label] = (monthCounts[label] || 0) + 1;
                          } catch (e) {
                            console.error("Error calculating month counts", e);
                          }
                        });

                        const sortedMonths = Object.entries(monthCounts);

                        if (sortedMonths.length === 0) return <p className="text-xs text-gray-400">Sem dados.</p>;

                        // Max month count for percentage calculation
                        const maxVal = Math.max(...sortedMonths.map(([_, v]) => v), 1);

                        return sortedMonths.map(([monthLabel, count]) => {
                          const percent = Math.min(100, Math.round((count / maxVal) * 100));
                          return (
                            <div key={monthLabel} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-zinc-300">
                                <span>{monthLabel}</span>
                                <span className="text-brand-red font-black">{count} treinos</span>
                              </div>
                              <div className="w-full h-2 bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-brand-red rounded-full" 
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div className="bg-brand-dark text-white p-5 rounded-2xl shadow-md border border-gray-800 relative overflow-hidden">
                    <div className="absolute right-[-10px] bottom-[-10px] text-white/5 font-black text-7xl select-none">BJJ</div>
                    <h4 className="text-[10px] font-black uppercase text-brand-red tracking-widest mb-1.5">
                      Compromisso
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">
                      &ldquo;A consistência é o caminho mais curto para a excelência técnica. Cada treino é um tijolo na construção da sua faixa preta.&rdquo;
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-black text-brand-red uppercase">
                      <span>Oss!</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="notes-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {progressEvents.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-150 dark:border-zinc-800">
                <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h4 className="text-gray-700 dark:text-zinc-300 font-bold uppercase tracking-tight text-sm">
                  Nenhuma anotação técnica
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  As anotações, notas de treino, graus e avaliações dos professores serão mostradas aqui em uma linha do tempo.
                </p>
              </div>
            ) : (
              <div className="relative border-l-2 border-brand-red/30 dark:border-brand-red/20 pl-6 ml-4 space-y-6 py-2">
                {progressEvents.map((event, idx) => {
                  const isGraduation = event.type === 'graduation';
                  
                  return (
                    <div key={event.id || idx} className="relative">
                      {/* Timeline Dot/Icon */}
                      <span className={`absolute left-[-33px] top-1 flex items-center justify-center w-7.5 h-7.5 rounded-full ring-4 ring-white dark:ring-gray-900 ${
                        isGraduation 
                          ? 'bg-yellow-500 text-white shadow-md' 
                          : 'bg-brand-red text-white'
                      }`}>
                        {isGraduation ? <Award className="w-4.5 h-4.5" /> : <FileText className="w-4.5 h-4.5" />}
                      </span>

                      {/* Card Content */}
                      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-zinc-800 shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-gray-100 dark:border-zinc-800/80 pb-2">
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-gray-100 dark:bg-gray-750 text-gray-500 dark:text-gray-400">
                              {event.title || (isGraduation ? 'Graduação' : 'Anotação')}
                            </span>
                            <h5 className="font-extrabold text-gray-800 dark:text-zinc-100 text-sm uppercase tracking-tight mt-1">
                              {isGraduation ? `Graduação: ${event.text}` : (event.title || 'Avaliação Técnica')}
                            </h5>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="text-xs font-bold text-brand-red">
                              {event.date}
                            </p>
                            {event.instructor && (
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-0.5">
                                Por: {event.instructor}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-semibold whitespace-pre-wrap">
                          {event.text || event.note || event.comment}
                        </div>

                        {/* If they added grades/degrees */}
                        {(event.degrees !== undefined || event.degree !== undefined) && (
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span>Grau concedido: {event.degrees || event.degree}º</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
