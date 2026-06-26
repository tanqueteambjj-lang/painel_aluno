import { Trophy, ShieldHalf, Flame, Star, Printer } from 'lucide-react';
import { motion } from 'motion/react';

export default function Ranking({ currentUserData, ranking, lastMonthRanking, isAdmin, title, subtitle, activeTab, onTabChange }: any) {
  const handlePrintRanking = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor, libere popups para imprimir o ranking.");
      return;
    }

    const typeStr = (title || '').toLowerCase().includes("kids") || (title || '').toLowerCase().includes("samurais") ? "Infantil" : "Adulto";
    const tabLabel = activeTab === 'xp' ? "Nível (XP)" : "Treinos (Frequência)";
    const dateNow = new Date().toLocaleDateString('pt-BR');

    // Filter top 3 for podium visualization
    const podium1 = lastMonthRanking?.[0] || null;
    const podium2 = lastMonthRanking?.[1] || null;
    const podium3 = lastMonthRanking?.[2] || null;
    const restPodium = lastMonthRanking?.slice(3, 5) || [];

    // Base64 or empty placeholder avatar generator
    const getAvatarImg = (photo: string | null) => {
      if (photo) return `<img src="${photo}" class="student-photo" />`;
      return `
        <div class="student-photo-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="7" r="4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      `;
    };

    // Helper to get belt badge color
    const getBeltBadgeStyle = (belt: string) => {
      const b = (belt || '').toLowerCase();
      if (b.includes('preta')) return 'background-color: #18181b; color: #ffffff; border: 1px solid #3f3f46;';
      if (b.includes('marrom') || b.includes('castanha')) return 'background-color: #78350f; color: #ffffff;';
      if (b.includes('roxa')) return 'background-color: #581c87; color: #ffffff;';
      if (b.includes('azul')) return 'background-color: #1e3a8a; color: #ffffff;';
      if (b.includes('verde')) return 'background-color: #14532d; color: #ffffff;';
      if (b.includes('laranja')) return 'background-color: #ea580c; color: #ffffff;';
      if (b.includes('amarela')) return 'background-color: #eab308; color: #1e293b;';
      if (b.includes('cinza')) return 'background-color: #64748b; color: #ffffff;';
      return 'background-color: #f1f5f9; color: #1e293b; border: 1px solid #cbd5e1;';
    };

    const podiumHTML = `
      <div class="podium-container">
        <!-- 2nd Place -->
        <div class="podium-card podium-2nd">
          <div class="podium-badge">2º Lugar</div>
          <div class="photo-wrapper border-silver">
            ${getAvatarImg(podium2?.photoBase64)}
          </div>
          <div class="podium-name">${podium2 ? formatDisplayName(podium2) : '---'}</div>
          <div class="podium-score">${podium2 ? (activeTab === 'xp' ? `${podium2.xp || 0} XP` : `${podium2.classes || 0} Treinos`) : ''}</div>
          <div class="podium-step step-silver">2</div>
        </div>

        <!-- 1st Place -->
        <div class="podium-card podium-1st">
          <div class="podium-badge badge-gold">🥇 1º Lugar</div>
          <div class="photo-wrapper border-gold">
            ${getAvatarImg(podium1?.photoBase64)}
          </div>
          <div class="podium-name font-large">${podium1 ? formatDisplayName(podium1) : '---'}</div>
          <div class="podium-score text-gold">${podium1 ? (activeTab === 'xp' ? `${podium1.xp || 0} XP` : `${podium1.classes || 0} Treinos`) : ''}</div>
          <div class="podium-step step-gold">1</div>
        </div>

        <!-- 3rd Place -->
        <div class="podium-card podium-3rd">
          <div class="podium-badge">3º Lugar</div>
          <div class="photo-wrapper border-bronze">
            ${getAvatarImg(podium3?.photoBase64)}
          </div>
          <div class="podium-name">${podium3 ? formatDisplayName(podium3) : '---'}</div>
          <div class="podium-score">${podium3 ? (activeTab === 'xp' ? `${podium3.xp || 0} XP` : `${podium3.classes || 0} Treinos`) : ''}</div>
          <div class="podium-step step-bronze">3</div>
        </div>
      </div>

      ${restPodium.length > 0 ? `
        <div class="rest-podium-container">
          ${restPodium.map((student, idx) => `
            <div class="rest-podium-card">
              <span class="rest-place">${idx + 4}º</span>
              <div class="photo-wrapper-small">
                ${getAvatarImg(student.photoBase64)}
              </div>
              <div class="rest-info">
                <span class="rest-name">${formatDisplayName(student)}</span>
                <span class="rest-score">${activeTab === 'xp' ? `${student.xp || 0} XP` : `${student.classes || 0} Treinos`}</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    const rankingRowsHTML = ranking.map((student: any, i: number) => `
      <tr class="${student.id === currentUserData?.id ? 'row-self' : ''}">
        <td class="col-rank">
          <span class="rank-badge ${i === 0 ? 'badge-gold' : i === 1 ? 'badge-silver' : i === 2 ? 'badge-bronze' : 'badge-normal'}">
            ${i + 1}º
          </span>
        </td>
        <td class="col-photo">
          <div class="row-photo-wrapper">
            ${getAvatarImg(student.photoBase64)}
          </div>
        </td>
        <td class="col-name">
          <div class="student-details">
            <span class="student-name">${formatDisplayName(student)}</span>
            ${student.id === currentUserData?.id ? '<span class="tag-you">VOCÊ</span>' : ''}
          </div>
        </td>
        <td class="col-belt">
          <span class="belt-badge" style="${getBeltBadgeStyle(student.belt)}">
            ${student.belt}
          </span>
        </td>
        <td class="col-score">
          <div class="score-container">
            <span class="score-value">${activeTab === 'xp' ? (student.xp || 0) : student.classes}</span>
            <span class="score-unit">${activeTab === 'xp' ? 'XP' : 'Treinos'}</span>
          </div>
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório de Ranking - Tanque Team</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap');
            
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              color: #1c1917;
              background-color: #ffffff;
              padding: 40px;
              line-height: 1.4;
            }

            .no-print-btn {
              position: fixed;
              top: 20px;
              right: 20px;
              background-color: #ef4444;
              color: white;
              border: none;
              padding: 12px 24px;
              font-size: 14px;
              font-weight: 800;
              text-transform: uppercase;
              border-radius: 8px;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
              z-index: 9999;
              display: flex;
              align-items: center;
              gap: 8px;
              font-family: 'Space Grotesk', sans-serif;
              transition: background-color 0.2s;
            }

            .no-print-btn:hover {
              background-color: #dc2626;
            }

            @media print {
              .no-print-btn {
                display: none !important;
              }
              body {
                padding: 0;
              }
            }

            /* Header styles */
            .header {
              border-bottom: 4px solid #ef4444;
              padding-bottom: 20px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }

            .header-left {
              display: flex;
              flex-direction: column;
            }

            .gym-title {
              font-family: 'Cinzel', serif;
              font-size: 32px;
              font-weight: 800;
              color: #0c0a09;
              text-transform: uppercase;
              letter-spacing: 2px;
            }

            .gym-subtitle {
              font-size: 14px;
              color: #78716c;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 3px;
              margin-top: 4px;
            }

            .report-title {
              font-family: 'Space Grotesk', sans-serif;
              background: #ef4444;
              color: white;
              padding: 6px 16px;
              font-size: 13px;
              font-weight: 800;
              border-radius: 6px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-top: 10px;
              width: fit-content;
            }

            .header-right {
              text-align: right;
              font-size: 11px;
              color: #78716c;
              font-weight: 600;
            }

            /* Section Title */
            .section-header {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 20px;
              border-bottom: 2px solid #e7e5e4;
              padding-bottom: 8px;
            }

            .section-icon {
              font-size: 20px;
            }

            .section-title {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 16px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: #0c0a09;
            }

            /* Podium Styles */
            .podium-container {
              display: flex;
              align-items: flex-end;
              justify-content: center;
              gap: 15px;
              margin: 30px auto;
              max-width: 650px;
              height: 250px;
              padding-bottom: 10px;
            }

            .podium-card {
              flex: 1;
              background-color: #fafaf9;
              border: 1px solid #e7e5e4;
              border-radius: 16px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-end;
              padding: 15px 10px;
              text-align: center;
              position: relative;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }

            .podium-1st {
              height: 100%;
              border-color: #f59e0b;
              background-color: #fffbeb;
            }

            .podium-2nd {
              height: 85%;
              border-color: #cbd5e1;
              background-color: #f8fafc;
            }

            .podium-3rd {
              height: 75%;
              border-color: #b45309;
              background-color: #fff7ed;
            }

            .podium-badge {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 4px 8px;
              border-radius: 9999px;
              background: #e7e5e4;
              color: #44403c;
              margin-bottom: 8px;
            }

            .badge-gold {
              background: #f59e0b !important;
              color: white !important;
            }

            .photo-wrapper {
              width: 64px;
              height: 64px;
              border-radius: 50%;
              overflow: hidden;
              background: #e7e5e4;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid transparent;
            }

            .photo-wrapper-small {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              overflow: hidden;
              background: #e7e5e4;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 1.5px solid #cbd5e1;
            }

            .border-gold { border-color: #f59e0b; }
            .border-silver { border-color: #94a3b8; }
            .border-bronze { border-color: #d97706; }

            .student-photo {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .student-photo-placeholder {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #e7e5e4;
              color: #78716c;
            }

            .student-photo-placeholder svg {
              width: 50%;
              height: 50%;
            }

            .podium-name {
              font-size: 12px;
              font-weight: 800;
              color: #1c1917;
              width: 100%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .font-large {
              font-size: 14px;
            }

            .podium-score {
              font-size: 11px;
              font-weight: 700;
              color: #78716c;
              margin-top: 2px;
              margin-bottom: 8px;
            }

            .text-gold {
              color: #b45309;
            }

            .podium-step {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 24px;
              font-weight: 800;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
            }

            .step-gold { background: #f59e0b; }
            .step-silver { background: #94a3b8; }
            .step-bronze { background: #d97706; }

            /* Rest of Podium Cards */
            .rest-podium-container {
              display: flex;
              justify-content: center;
              gap: 20px;
              margin-top: -15px;
              margin-bottom: 40px;
            }

            .rest-podium-card {
              display: flex;
              align-items: center;
              gap: 10px;
              background: #fafaf9;
              border: 1px solid #e7e5e4;
              padding: 8px 16px;
              border-radius: 12px;
              font-size: 11px;
            }

            .rest-place {
              font-weight: 800;
              color: #78716c;
            }

            .rest-info {
              display: flex;
              flex-direction: column;
            }

            .rest-name {
              font-weight: 750;
              color: #1c1917;
            }

            .rest-score {
              font-weight: 600;
              color: #ef4444;
              font-size: 10px;
            }

            /* Table Styles */
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              page-break-inside: auto;
            }

            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }

            thead {
              display: table-header-group;
            }

            th {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              color: #78716c;
              text-align: left;
              padding: 12px 16px;
              border-bottom: 2px solid #0c0a09;
              letter-spacing: 1px;
            }

            td {
              padding: 12px 16px;
              border-bottom: 1px solid #e7e5e4;
              vertical-align: middle;
            }

            .row-self {
              background-color: #fff5f5;
            }

            .col-rank {
              width: 60px;
            }

            .rank-badge {
              font-family: 'Space Grotesk', sans-serif;
              font-weight: 800;
              font-size: 12px;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              display: inline-flex;
              align-items: center;
              justify-content: center;
            }

            .badge-silver {
              background-color: #e2e8f0;
              color: #475569;
            }

            .badge-bronze {
              background-color: #ffedd5;
              color: #c2410c;
            }

            .badge-normal {
              background-color: #f5f5f4;
              color: #57534e;
            }

            .col-photo {
              width: 60px;
            }

            .row-photo-wrapper {
              width: 38px;
              height: 38px;
              border-radius: 50%;
              overflow: hidden;
              background: #f5f5f4;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 1px solid #cbd5e1;
            }

            .student-details {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .student-name {
              font-size: 13px;
              font-weight: 700;
              color: #0c0a09;
            }

            .tag-you {
              background-color: #ef4444;
              color: white;
              font-size: 8px;
              font-weight: 900;
              padding: 2px 6px;
              border-radius: 4px;
              letter-spacing: 0.5px;
            }

            .belt-badge {
              display: inline-block;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 4px 10px;
              border-radius: 6px;
              letter-spacing: 0.5px;
              white-space: nowrap;
            }

            .col-score {
              text-align: right;
              width: 120px;
            }

            .score-container {
              display: inline-flex;
              align-items: baseline;
              gap: 3px;
            }

            .score-value {
              font-size: 16px;
              font-weight: 800;
              color: #0c0a09;
            }

            .score-unit {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #ef4444;
            }

            /* Footer Styles */
            .footer {
              margin-top: 60px;
              border-top: 1px solid #e7e5e4;
              padding-top: 30px;
              text-align: center;
              page-break-inside: avoid;
            }

            .quote {
              font-style: italic;
              font-size: 12px;
              color: #57534e;
              margin-bottom: 40px;
              max-width: 500px;
              margin-left: auto;
              margin-right: auto;
            }

            .signatures {
              display: flex;
              justify-content: space-around;
              margin-top: 20px;
            }

            .signature-block {
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 200px;
            }

            .sig-line {
              width: 100%;
              border-bottom: 1px solid #78716c;
              margin-bottom: 8px;
            }

            .sig-title {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #78716c;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <button class="no-print-btn" onclick="window.print()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Imprimir Relatório
          </button>

          <div class="header">
            <div class="header-left">
              <span class="gym-title">Tanque Team</span>
              <span class="gym-subtitle">Escola de Artes Marciais</span>
              <span class="report-title">Relatório de Ranking - ${typeStr}</span>
            </div>
            <div class="header-right">
              <p>Métrica: <strong>${tabLabel}</strong></p>
              <p>Gerado em: <strong>${dateNow}</strong></p>
              <p>Status: <strong>Oficial</strong></p>
            </div>
          </div>

          <!-- SECTION 1: PODIUM DO MÊS PASSADO -->
          <div class="section-header">
            <span class="section-icon">🏆</span>
            <h4 class="section-title">Pódio Consolidado do Mês Anterior</h4>
          </div>
          
          ${podiumHTML}

          <!-- SECTION 2: CLASSIFICAÇÃO ATUAL -->
          <div class="section-header" style="margin-top: 20px;">
            <span class="section-icon">📊</span>
            <h4 class="section-title">Classificação Geral (Mês Vigente)</h4>
          </div>

          <table>
            <thead>
              <tr>
                <th class="col-rank">Pos</th>
                <th class="col-photo">Atleta</th>
                <th class="col-name">Nome</th>
                <th class="col-belt">Graduação</th>
                <th class="col-score" style="text-align: right;">Pontuação</th>
              </tr>
            </thead>
            <tbody>
              ${rankingRowsHTML}
            </tbody>
          </table>

          <div class="footer">
            <p class="quote">
              &ldquo;A constância é o caminho mais curto para a excelência técnica. Cada treino é um tijolo na construção da sua faixa preta.&rdquo;
            </p>
            <div class="signatures">
              <div class="signature-block">
                <div class="sig-line"></div>
                <span class="sig-title">Professor Responsável</span>
              </div>
              <div class="signature-block">
                <div class="sig-line"></div>
                <span class="sig-title">Coordenador Geral</span>
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
    if (isAdmin) {
      return student.nickname ? `${student.name} (${student.nickname})` : (student.name || 'Aluno');
    }
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
      <div className="mb-6 flex flex-col gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-brand-dark dark:text-white flex items-center gap-3">
              <Trophy className="text-yellow-500 w-7 h-7 md:w-8 md:h-8" /> {title || "Hall da Fama"}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle || "Reconhecimento pela sua dedicação e técnica."}</p>
          </div>

          {/* MANUAL BUTTON */}
          <div className="flex items-center gap-2">
             {isAdmin && (
               <button 
                 onClick={handlePrintRanking}
                 className="flex items-center gap-2 px-4 py-2 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-colors border border-transparent"
               >
                 <Printer size={14} /> Imprimir
               </button>
             )}
             <button 
               onClick={() => {
                 const el = document.getElementById('ranking-manual');
                 if (el) el.scrollIntoView({ behavior: 'smooth' });
               }}
               className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 transition-colors"
             >
                <Star size={14} /> Regras
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
      </div>
      
      {/* CAMPEÕES DO MÊS PASSADO */}
      {lastMonthRanking && lastMonthRanking.length > 0 && activeTab === 'presence' && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Star className="text-yellow-500 w-5 h-5 fill-yellow-500" />
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400">Pódio do Mês Passado</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {lastMonthRanking.map((student: any, i: number) => (
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

export function RankingManual() {
  return (
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
  );
}

