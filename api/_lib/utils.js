export const s = (v) => (v === null || v === undefined ? null : (String(v).trim() || null));
export const lowerEmail = (v) => { const e = s(v); return e ? e.toLowerCase() : null; };

/** Normalizador oficial dos 32 NREs do Paraná (caixa alta, sem acento). */
export function normalizeNre(nre) {
  if (!nre) return '';
  const x = String(nre).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^NRE\s*(DE|DO|DA)?\s*[-:]?\s*/, '').replace(/[.\-_/]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!x) return '';
  if (x === 'AMN' || /METROP\w*\s*NORTE/.test(x)) return 'AREA METROPOLITANA NORTE';
  if (x === 'AMS' || /METROP\w*\s*SUL/.test(x)) return 'AREA METROPOLITANA SUL';
  if (/^ASSIS\s*CHAT/.test(x)) return 'ASSIS CHATEAUBRIAND';
  if (x === 'FOZ') return 'FOZ DO IGUACU';
  if (x === 'BELTRAO') return 'FRANCISCO BELTRAO';
  if (x === 'UNIAO') return 'UNIAO DA VITORIA';
  if (x === 'WENCESLAU') return 'WENCESLAU BRAZ';
  if (x === 'CORNELIO') return 'CORNELIO PROCOPIO';
  if (x === 'TELEMACO') return 'TELEMACO BORBA';
  return x;
}

/** Aceita dd/mm/aaaa, aaaa-mm-dd e Date/ISO. Retorna 'YYYY-MM-DD' ou null. */
export function parseDate(v) {
  const t = s(v);
  if (!t) return null;
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Retorna 'YYYY-MM-DD HH:MM:SS' (hora local da planilha) ou null. */
export function parseDateTime(v) {
  const t = s(v);
  if (!t) return null;
  const br = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (br) {
    return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')} ${(br[4] || '00').padStart(2, '0')}:${(br[5] || '00').padStart(2, '0')}:${(br[6] || '00').padStart(2, '0')}`;
  }
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace('T', ' ');
}

/** Retorna 'HH:mm' ou null, descartando artefatos de data como '30/12/1899'. */
export function cleanTime(v) {
  const t = s(v);
  if (!t) return null;
  if (t.includes('1899') || t.includes('1900')) {
    const m = t.match(/(\d{1,2}:\d{2})/);
    return m ? m[1] : null;
  }
  const m2 = t.match(/^(\d{1,2}:\d{2})/);
  if (m2) return m2[1];
  return t.includes('/') ? null : t;
}
