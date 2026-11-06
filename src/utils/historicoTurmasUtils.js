/**
 * Histórico de turmas do cursista.
 *
 * Reconstrói a linha do tempo de turmas a partir dos logs de movimentação
 * (tabela `movimentacoes`) gravados pelo Painel Administrativo em cada
 * transferência / remanejamento / saída, mais a turma vigente do cursista.
 */

// Tipos de ação que representam mudança efetiva de turma (gerados pelo AdminPanel)
const isMovimentoDeTurma = (mov) => {
  const tipo = (mov?.tipo_acao || '').toLowerCase();
  return (
    tipo.startsWith('transfer') ||
    tipo.startsWith('remanejamento') ||
    tipo === 'saída' ||
    tipo === 'saida'
  );
};

const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

const normalizeNome = (v) =>
  String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

const toTimestamp = (mov) => {
  const t = Date.parse(mov?.timestamp || mov?.created_at || '');
  return Number.isNaN(t) ? 0 : t;
};

/**
 * @param {object} cursista       Registro do cursista (cgm, nome/nome_cursista, turmas/turma)
 * @param {Array}  movimentacoes  Lista completa de movimentações
 * @param {string} [turmaAtual]   Turma vigente (fallback: cursista.turmas/turma)
 * @returns {Array<{turma:string, inicio:string|null, fim:string|null, tipo:string, atual:boolean, saida:boolean}>}
 *          Ordenado do mais recente para o mais antigo.
 */
export function buildHistoricoTurmas(cursista, movimentacoes = [], turmaAtual = '') {
  if (!cursista) return [];

  const cgm = onlyDigits(cursista.cgm);
  const nome = normalizeNome(cursista.nome || cursista.nome_cursista);
  const turmaVigente = String(turmaAtual || cursista.turmas || cursista.turma || '').trim();

  const movs = (movimentacoes || [])
    .filter(isMovimentoDeTurma)
    .filter((m) => {
      const mCgm = onlyDigits(m.cgm);
      if (cgm && mCgm) return cgm === mCgm;
      return nome && normalizeNome(m.nome_cursista) === nome;
    })
    .sort((a, b) => toTimestamp(a) - toTimestamp(b));

  if (movs.length === 0) {
    return turmaVigente
      ? [{ turma: turmaVigente, inicio: null, fim: null, tipo: 'Enturmação inicial', atual: true, saida: false }]
      : [];
  }

  const etapas = [];
  // Turma de origem do 1º movimento = enturmação inicial
  etapas.push({
    turma: String(movs[0].turma_anterior || '').trim(),
    inicio: null,
    fim: movs[0].timestamp || null,
    tipo: 'Enturmação inicial',
    atual: false,
    saida: false,
  });

  movs.forEach((m, i) => {
    const saida = !String(m.turma_nova || '').trim();
    const proximo = movs[i + 1];
    etapas.push({
      turma: saida ? 'Saída do programa' : String(m.turma_nova).trim(),
      inicio: m.timestamp || null,
      fim: proximo ? proximo.timestamp || null : null,
      tipo: m.tipo_acao || 'Transferência',
      atual: !proximo && !saida,
      saida,
    });
  });

  return etapas.filter((e) => e.turma).reverse();
}
