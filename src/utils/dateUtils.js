/**
 * Utilitário de formatação de datas e carimbos para padrão PT-BR (Brasil)
 * SEED-PR - Estágio Probatório
 */

/**
 * Converte qualquer formato de data ou carimbo (ISO, SQL Date, JS Date string, timestamp)
 * para o formato brasileiro padrão:
 * - DD/MM/YYYY (quando includeTime === false)
 * - DD/MM/YYYY HH:mm (quando includeTime === true)
 * 
 * Trata casos como:
 * - "Tue Apr 14 2026 19:44:23 GMT-0300 (Brasilia Standard Time)"
 * - "2026-04-14"
 * - "2026-04-14T19:44:23.000Z"
 * - "14/04/2026"
 * - "14/04/2026 19:44:23"
 * - Objetos Date nativos
 */
export function formatDatePtBr(val, includeTime = false) {
  if (!val) return '—';

  // Se já for um objeto Date nativo
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '—';
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    if (includeTime) {
      const hh = String(val.getHours()).padStart(2, '0');
      const mm = String(val.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hh}:${mm}`;
    }
    return `${day}/${month}/${year}`;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed.toLowerCase() === 'não informada') {
      return '—';
    }

    // 1. Já está no formato brasileiro: DD/MM/YYYY ou DD/MM/YYYY HH:mm(:ss)
    const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::\d{2})?)?/);
    if (brMatch) {
      const day = brMatch[1].padStart(2, '0');
      const month = brMatch[2].padStart(2, '0');
      let year = brMatch[3];
      if (year.length === 2) year = '20' + year;
      const hh = brMatch[4];
      const mm = brMatch[5];
      if (includeTime && hh !== undefined && mm !== undefined) {
        return `${day}/${month}/${year} ${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
      }
      return `${day}/${month}/${year}`;
    }

    // 2. Formato ISO ou SQL Date YYYY-MM-DD ou YYYY-MM-DD HH:mm:ss (evita deslocamento de fuso de new Date("YYYY-MM-DD"))
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::\d{2})?)?/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2];
      const day = isoMatch[3];
      const hh = isoMatch[4];
      const mm = isoMatch[5];
      if (includeTime && hh !== undefined && mm !== undefined) {
        return `${day}/${month}/${year} ${hh}:${mm}`;
      }
      return `${day}/${month}/${year}`;
    }

    // 3. String de Data do JS (ex: "Tue Apr 14 2026 19:44:23 GMT-0300 (Brasilia Standard Time)")
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      if (includeTime) {
        const hh = String(parsed.getHours()).padStart(2, '0');
        const mm = String(parsed.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hh}:${mm}`;
      }
      return `${day}/${month}/${year}`;
    }

    return trimmed;
  }

  return String(val);
}

/**
 * Converte qualquer formato de data brasileira (DD/MM/YYYY), ISO (YYYY-MM-DD),
 * timestamp numérico ou string em um timestamp numérico (milissegundos) confiável para ordenação.
 */
export function parseDateToTimestamp(val) {
  if (!val) return 0;
  if (val instanceof Date) return isNaN(val.getTime()) ? 0 : val.getTime();
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return 0;
  
  const trimmed = val.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—') return 0;

  // 1. Formato brasileiro: DD/MM/YYYY ou DD/MM/YYYY HH:mm(:ss)
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    let year = parseInt(brMatch[3], 10);
    if (year < 100) year += 2000;
    const hh = brMatch[4] ? parseInt(brMatch[4], 10) : 0;
    const mm = brMatch[5] ? parseInt(brMatch[5], 10) : 0;
    const ss = brMatch[6] ? parseInt(brMatch[6], 10) : 0;
    return new Date(year, month, day, hh, mm, ss).getTime();
  }

  // 2. Formato ISO ou SQL Date: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const hh = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
    const mm = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
    const ss = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
    return new Date(year, month, day, hh, mm, ss).getTime();
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

