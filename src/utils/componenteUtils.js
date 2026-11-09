/**
 * Utilitário canônico de normalização de Componentes Curriculares da SEED-PR
 * Unifica variações com/sem acento e sinônimos operacionais.
 * Ex: EQUIPE PEDAGÓGICA = EQUIPE PEDAGOGICA, TECNICOS = TÉCNICOS, QUÍMICA = QUIMICA
 */

export function normalizeComponenteCanonical(comp) {
  if (!comp) return 'NÃO INFORMADO';
  let str = String(comp).trim().toUpperCase();

  // Remove múltiplos espaços
  str = str.replace(/\s+/g, ' ');

  // Base sem acentuação para matching resiliente
  const semAcento = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (semAcento.includes('EQUIPE PEDAGOGICA') || semAcento.includes('PEDAGOGIC') || semAcento.includes('GESTORA')) {
    return 'EQUIPE PEDAGÓGICA';
  }
  if (semAcento.includes('TECNICO') || semAcento.includes('TECNICA') || semAcento.includes('PROFISSIONAL') || semAcento.includes('EDUCACAO PROFISSIONAL')) {
    return 'TÉCNICOS';
  }
  if (semAcento === 'QUIMICA' || semAcento.includes('QUIMICA')) {
    return 'QUÍMICA';
  }
  if (semAcento === 'FISICA' || semAcento.includes('FISICA') && !semAcento.includes('EDUCACAO')) {
    return 'FÍSICA';
  }
  if (semAcento === 'BIOLOGIA' || semAcento.includes('BIOLOGIA')) {
    return 'BIOLOGIA';
  }
  if (semAcento === 'CIENCIAS' || semAcento.includes('CIENCIAS')) {
    return 'CIÊNCIAS';
  }
  if (semAcento === 'MATEMATICA' || semAcento.includes('MATEMATICA')) {
    return 'MATEMÁTICA';
  }
  if (semAcento === 'HISTORIA' || semAcento.includes('HISTORIA')) {
    return 'HISTÓRIA';
  }
  if (semAcento === 'GEOGRAFIA' || semAcento.includes('GEOGRAFIA')) {
    return 'GEOGRAFIA';
  }
  if (semAcento.includes('PORTUGUES') || semAcento.includes('LINGUA PORTUGUESA') || semAcento.includes('LETRAS PORTUGUES')) {
    return 'LÍNGUA PORTUGUESA';
  }
  if (semAcento.includes('INGLES') || semAcento.includes('LINGUA INGLESA') || semAcento === 'LEM' || semAcento.includes('LEM - INGLES')) {
    return 'LÍNGUA INGLESA';
  }
  if (semAcento.includes('ESPANHOL') || semAcento.includes('LINGUA ESPANHOLA') || semAcento.includes('LEM - ESPANHOL')) {
    return 'LÍNGUA ESPANHOLA';
  }
  if (semAcento === 'ARTE' || semAcento === 'ARTES' || semAcento.includes('ARTE')) {
    return 'ARTE';
  }
  if (semAcento.includes('EDUCACAO FISICA') || semAcento.includes('ED. FISICA') || semAcento === 'ED FISICA') {
    return 'EDUCAÇÃO FÍSICA';
  }
  if (semAcento === 'FILOSOFIA' || semAcento.includes('FILOSOFIA')) {
    return 'FILOSOFIA';
  }
  if (semAcento === 'SOCIOLOGIA' || semAcento.includes('SOCIOLOGIA')) {
    return 'SOCIOLOGIA';
  }
  if (semAcento.includes('ROBOTICA')) {
    return 'ROBÓTICA';
  }
  if (semAcento.includes('PROGRAMACAO') || semAcento.includes('PENSAMENTO COMPUTACIONAL')) {
    return 'PROGRAMAÇÃO';
  }
  if (semAcento.includes('EDUCACAO ESPECIAL') || semAcento.includes('ED. ESPECIAL') || semAcento.includes('SALA DE RECURSOS')) {
    return 'EDUCAÇÃO ESPECIAL';
  }

  return str;
}
