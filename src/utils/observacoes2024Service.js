/**
 * Serviço para carregamento sob demanda e cache das observações de 2024
 */

let observacoes2024Cache = null;
let carregarPromise = null;

function normalizeName(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Carrega o arquivo public/observacoes_2024.json de forma assíncrona com cache em memória
 */
export async function carregarObservacoes2024() {
  if (observacoes2024Cache) {
    return observacoes2024Cache;
  }

  if (carregarPromise) {
    return carregarPromise;
  }

  carregarPromise = (async () => {
    try {
      const res = await fetch('/observacoes_2024.json');
      if (!res.ok) {
        console.warn('Arquivo observacoes_2024.json não encontrado ou erro de rede:', res.status);
        return [];
      }
      const data = await res.json();
      
      // Mapeia os atributos compactados de volta para o formato padrão do dashboard
      const expandido = data.map(item => ({
        id: item.id,
        id_origem: item.id,
        ano_letivo: '2024',
        ano_formativo: '2024',
        semestre: '2024',
        carimbo: item.dp || item.do || item.df || '2024',
        nome_cursista: item.nc,
        nome_norm: item.nk,
        email_cursista: item.ec || '',
        nome_formador: item.nf,
        email_formador: item.ef,
        componente: item.cp,
        tema: item.tm || 'Observação 2024',
        is_realizada: Boolean(item.ir),
        observacao_realizada: item.ir ? 'Sim' : 'Não Realizada',
        data_pratica: item.dp,
        data_observacao: item.do,
        data_feedback: item.df,
        modalidade_feedback: item.mf,
        link_gravacao_pratica: item.lp,
        link_gravacao_feedback: item.lf,
        evidencias_pratica: item.ev,
        questionamentos_propositivos: item.qp,
        proposicoes_sugestoes: item.ps,
        nivel_planejamento: item.npl,
        nivel_pratica: item.npr,
        justificativa_nao_realizada: item.jn
      }));

      observacoes2024Cache = expandido;
      return expandido;
    } catch (err) {
      console.warn('Erro ao carregar observações 2024:', err);
      return [];
    } finally {
      carregarPromise = null;
    }
  })();

  return carregarPromise;
}

/**
 * Retorna as observações de 2024 correspondentes a um cursista específico (por nome ou email)
 */
export async function getObservacoes2024PorCursista(cursista) {
  if (!cursista) return [];
  const todas = await carregarObservacoes2024();
  
  const emailCursista = (cursista.email || cursista.email_cursista || cursista['e-mail'] || '').trim().toLowerCase();
  const nomeNorm = normalizeName(cursista.nome || cursista.nome_cursista || '');

  return todas.filter(obs => {
    if (emailCursista && obs.email_cursista && obs.email_cursista === emailCursista) {
      return true;
    }
    if (nomeNorm && obs.nome_norm && obs.nome_norm === nomeNorm) {
      return true;
    }
    return false;
  });
}
