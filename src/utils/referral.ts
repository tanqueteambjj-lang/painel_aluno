/**
 * Referral / Indicação de Amigos - Tanque Team BJJ
 */

export function getStudentReferralCode(student: any): string {
  if (!student) return 'TANQUE-1000';
  
  // If referralCode is present and non-empty string in student data
  if (student.referralCode && typeof student.referralCode === 'string' && student.referralCode.trim() !== '') {
    return student.referralCode.trim().toUpperCase();
  }

  // Fallback: Generate clean deterministic code e.g. "CARLOS-7842" or "LUCAS-1234"
  const rawName = (student.nickname || student.name || 'ALUNO').trim();
  const firstName = rawName.split(/\s+/)[0].toUpperCase();
  const cleanName = firstName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '') || 'ALUNO';

  const seed = (student.id || student.studentLogin || student.phone || cleanName).toString();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const codeNum = Math.abs(hash % 9000) + 1000;

  return `${cleanName}-${codeNum}`;
}

export function getReferralRegistrationUrl(student: any): string {
  const code = getStudentReferralCode(student);
  return `https://www.tanqueteambjj.com.br/matricula.html?cupom=${encodeURIComponent(code)}`;
}

export function generateReferralWhatsAppMessage(student: any): {
  url: string;
  text: string;
  referralCode: string;
  registrationUrl: string;
} {
  const referralCode = getStudentReferralCode(student);
  const studentName = (student?.nickname || student?.name || 'Seu amigo').trim();
  const registrationUrl = getReferralRegistrationUrl(student);

  const text = `🥋 *CONVITE ESPECIAL - TANQUE TEAM BJJ!* 🔥

Fala amigo(a)! Estou treinando Jiu-Jitsu na *Tanque Team BJJ* e tenho um presente para você: um *SUPER DESCONTO EXCLUSIVO* na sua matrícula! 🥇👊

🎁 *Seu Cupom de Desconto:* *${referralCode}*
👤 *Indicado por:* ${studentName}

Acesse o link abaixo para fazer sua matrícula com o desconto aplicado automaticamente:
👉 ${registrationUrl}

Te espero no tatame! Oss! 🥋`;

  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

  return {
    url,
    text,
    referralCode,
    registrationUrl
  };
}
