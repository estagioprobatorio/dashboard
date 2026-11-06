/**
 * Utilitário de Normalização dos 32 Núcleos Regionais de Educação (NREs)
 * SEED-PR • Estágio Probatório
 * 
 * Padrão Oficial: Caixa alta, sem acentos, sem cedilha, espaços normalizados.
 */

export const NRES_OFICIAIS = [
  'APUCARANA',
  'AREA METROPOLITANA NORTE',
  'AREA METROPOLITANA SUL',
  'ASSIS CHATEAUBRIAND',
  'CAMPO MOURAO',
  'CASCAVEL',
  'CIANORTE',
  'CORNELIO PROCOPIO',
  'CURITIBA',
  'DOIS VIZINHOS',
  'FOZ DO IGUACU',
  'FRANCISCO BELTRAO',
  'GOIOERE',
  'GUARAPUAVA',
  'IBAITI',
  'IRATI',
  'IVAIPORA',
  'JACAREZINHO',
  'LARANJEIRAS DO SUL',
  'LOANDA',
  'LONDRINA',
  'MARINGA',
  'PARANAGUA',
  'PARANAVAI',
  'PATO BRANCO',
  'PITANGA',
  'PONTA GROSSA',
  'TELEMACO BORBA',
  'TOLEDO',
  'UMUARAMA',
  'UNIAO DA VITORIA',
  'WENCESLAU BRAZ'
];

export const NRES_SET = new Set(NRES_OFICIAIS);

/**
 * Normaliza qualquer variação de nome de NRE (com acento, abreviação, minúsculas)
 * para o formato oficial unificado sem acento.
 * 
 * Exemplo:
 * 'CORNÉLIO PROCÓPIO' ➔ 'CORNELIO PROCOPIO'
 * 'Área Metropolitana Sul' ➔ 'AREA METROPOLITANA SUL'
 * 'Foz do Iguaçu' ➔ 'FOZ DO IGUACU'
 */
export function normalizeNre(nre) {
  if (!nre) return '';
  const s = String(nre)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^NRE\s*(DE|DO|DA)?\s*[-–:]?\s*/, '')
    .replace(/[.\-–_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!s) return '';

  // Área Metropolitana Norte/Sul: cobre 'AREA METROP.NORTE', 'A. METROP. SUL', 'AMN', 'METROPOLITANA SUL' etc.
  if (s === 'AMN' || /METROP\w*\s*NORTE/.test(s) || /^A\s*M\s*N$/.test(s)) return 'AREA METROPOLITANA NORTE';
  if (s === 'AMS' || /METROP\w*\s*SUL/.test(s) || /^A\s*M\s*S$/.test(s)) return 'AREA METROPOLITANA SUL';
  if (/^ASSIS\s*CHAT/.test(s)) return 'ASSIS CHATEAUBRIAND';
  if (s === 'FOZ') return 'FOZ DO IGUACU';
  if (s === 'FRANCISCO BELTRAO' || s === 'BELTRAO') return 'FRANCISCO BELTRAO';
  if (s === 'UNIAO DA VITORIA' || s === 'UNIAO') return 'UNIAO DA VITORIA';
  if (s === 'WENCESLAU BRAZ' || s === 'WENCESLAU') return 'WENCESLAU BRAZ';
  if (s === 'CORNELIO PROCOPIO' || s === 'CORNELIO') return 'CORNELIO PROCOPIO';
  if (s === 'TELEMACO BORBA' || s === 'TELEMACO') return 'TELEMACO BORBA';

  return s;
}
