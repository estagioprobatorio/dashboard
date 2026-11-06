import fallbackData from '../data_fallback.json';

// Dicionário estático de fallback dos Formadores Oficiais
const formadoresFallbackDict = new Map();
(fallbackData || []).forEach(r => {
  const nome = (r.nome_formador || r.formador || '').trim();
  const key = nome.toUpperCase();
  const email = (r.email_formador || r['e-mail_formador'] || r.e_mail_formador || '').trim().toLowerCase();
  const tel = (r.telefone_formador || r.fone_formador || '').trim();
  const nre = (r.nre_formador || r.nre || '').trim();
  const comp = (r.componente_formador || r.componente || '').trim();

  if (key && !['SEM FORMADOR', 'NÃO INFORMADO', '-', 'A DEFINIR', ''].includes(key)) {
    if (!formadoresFallbackDict.has(key)) {
      formadoresFallbackDict.set(key, { nome, email, telefone: tel, nre, componente: comp });
    } else {
      const existing = formadoresFallbackDict.get(key);
      if (!existing.email && email) existing.email = email;
      if (!existing.telefone && tel) existing.telefone = tel;
    }
  }
});

/**
 * Normaliza o nome do formador para chave de busca sem acentos
 */
export function normalizeFormadorKey(name) {
  if (!name) return '';
  return String(name)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Resolve o e-mail oficial do Formador buscando em múltiplas fontes:
 * 1. Objeto atual (se já contiver email_formador ou e-mail_formador válido)
 * 2. Array de registros ativos (records/cursistas)
 * 3. Array de observações (observacoes_pratica)
 * 4. Dicionário de Formadores do SEED-PR (fallbackData)
 */
export function getFormadorEmail(nomeOrObj, records = [], observacoes = []) {
  if (!nomeOrObj) return '';

  // Se passou um objeto diretamente (ex: item de turma, cursista ou observação)
  if (typeof nomeOrObj === 'object') {
    const directEmail = (
      nomeOrObj.email_formador ||
      nomeOrObj['e-mail_formador'] ||
      nomeOrObj.e_mail_formador ||
      nomeOrObj.emailFormador ||
      nomeOrObj.formadorEmail ||
      ''
    ).trim().toLowerCase();

    if (directEmail && directEmail.includes('@')) {
      return directEmail;
    }
  }

  const rawNome = typeof nomeOrObj === 'string' 
    ? nomeOrObj 
    : (nomeOrObj.nome_formador || nomeOrObj.formador || nomeOrObj.nome || '');

  const key = (rawNome || '').trim().toUpperCase();
  if (!key || ['SEM FORMADOR', 'NÃO INFORMADO', '-', 'A DEFINIR', ''].includes(key)) {
    return '';
  }

  // 1. Buscar no array de registros dinâmicos (records)
  if (Array.isArray(records) && records.length > 0) {
    const foundRec = records.find(r => {
      const fn = (r.nome_formador || r.formador || '').trim().toUpperCase();
      const fe = (r.email_formador || r['e-mail_formador'] || r.e_mail_formador || '').trim().toLowerCase();
      return fn === key && fe && fe.includes('@');
    });
    if (foundRec) {
      return (foundRec.email_formador || foundRec['e-mail_formador'] || foundRec.e_mail_formador).trim().toLowerCase();
    }
  }

  // 2. Buscar no array de observações
  if (Array.isArray(observacoes) && observacoes.length > 0) {
    const foundObs = observacoes.find(o => {
      const fn = (o.nome_formador || o.formador || '').trim().toUpperCase();
      const fe = (o.email_formador || o.formador_email || '').trim().toLowerCase();
      return fn === key && fe && fe.includes('@');
    });
    if (foundObs) {
      return (foundObs.email_formador || foundObs.formador_email).trim().toLowerCase();
    }
  }

  // 3. Buscar no dicionário de fallback
  if (formadoresFallbackDict.has(key)) {
    return formadoresFallbackDict.get(key).email;
  }

  // 4. Busca flexível por aproximação (sem acentos)
  const normKey = normalizeFormadorKey(key);
  for (const [fKey, fData] of formadoresFallbackDict.entries()) {
    if (normalizeFormadorKey(fKey) === normKey && fData.email) {
      return fData.email;
    }
  }

  return '';
}

/**
 * Retorna os dados completos do Formador (nome, email, telefone, nre, componente)
 */
export function getFormadorInfo(nomeOrObj, records = [], observacoes = []) {
  const email = getFormadorEmail(nomeOrObj, records, observacoes);
  const rawNome = typeof nomeOrObj === 'string' 
    ? nomeOrObj 
    : (nomeOrObj?.nome_formador || nomeOrObj?.formador || nomeOrObj?.nome || '');
  const key = (rawNome || '').trim().toUpperCase();
  const fallback = formadoresFallbackDict.get(key) || {};

  return {
    nome: rawNome || fallback.nome || 'Não informado',
    email: email || fallback.email || '',
    telefone: (typeof nomeOrObj === 'object' ? (nomeOrObj.telefone_formador || nomeOrObj.telefone) : '') || fallback.telefone || '',
    nre: (typeof nomeOrObj === 'object' ? (nomeOrObj.nre_formador || nomeOrObj.nre) : '') || fallback.nre || '',
    componente: (typeof nomeOrObj === 'object' ? (nomeOrObj.componente_formador || nomeOrObj.componente) : '') || fallback.componente || ''
  };
}
