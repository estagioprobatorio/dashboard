import { supabase, isConfigured as isSupabaseConfigured } from '../supabase';
import { tidbService } from '../services/tidbService';

const STORAGE_KEY = 'ep_observacoes_locais_novas';

/**
 * Salva uma nova observação tanto no TiDB Cloud quanto na Planilha do Google (via Apps Script)
 * e também armazena em cache local para garantir funcionamento 100% resiliente.
 */
export async function salvarObservacaoIntegrada(novaObservacao) {
  const resultados = {
    tidb: false,
    supabase: false,
    googleSheets: false,
    local: false,
    mensagem: ''
  };

  // 1. Persistência no LocalStorage (Rede de segurança local imediata)
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    existing.unshift(novaObservacao);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    resultados.local = true;
  } catch (err) {
    console.warn('Erro ao salvar no localStorage:', err);
  }

  // 2. Persistência Direta no TiDB Cloud Serverless
  try {
    const okTiDB = await tidbService.salvarObservacao(novaObservacao);
    resultados.tidb = okTiDB;
    if (okTiDB) {
      console.log('✓ Observação salva no TiDB Cloud com sucesso!');
    }
  } catch (errTiDB) {
    console.warn('Falha na inserção no TiDB:', errTiDB);
  }

  // 3. Persistência no Supabase (se configurado - fallback opcional)
  if (isSupabaseConfigured && supabase) {
    try {
      const payloadSupabase = {
        id_origem: novaObservacao.id_origem || `OBS_${Date.now()}`,
        carimbo: novaObservacao.carimbo || new Date().toLocaleString('pt-BR'),
        email_cursista: novaObservacao.email_cursista,
        nome_cursista: novaObservacao.nome_cursista,
        email_formador: novaObservacao.email_formador,
        nome_formador: novaObservacao.nome_formador,
        ano_formativo: novaObservacao.ano_formativo,
        semestre: novaObservacao.semestre,
        modalidade: novaObservacao.modalidade,
        componente: novaObservacao.componente,
        tema: novaObservacao.tema,
        observacao_realizada: novaObservacao.observacao_realizada,
        is_realizada: Boolean(novaObservacao.is_realizada),
        data_pratica: novaObservacao.data_pratica || novaObservacao.data_implementacao || null,
        data_implementacao: novaObservacao.data_implementacao || novaObservacao.data_pratica || null,
        data_observacao: novaObservacao.data_observacao || null,
        data_feedback: novaObservacao.data_feedback || null,
        modalidade_feedback: novaObservacao.modalidade_feedback,
        motivo_devolutiva: novaObservacao.motivo_devolutiva || null,
        link_gravacao_pratica: novaObservacao.link_gravacao_pratica || null,
        link_planejamento: novaObservacao.link_planejamento || null,
        link_pdp: novaObservacao.link_pdp || null,
        proposta_pedagogica: novaObservacao.proposta_pedagogica || null,
        link_gravacao_feedback: novaObservacao.link_gravacao_feedback || null,
        nivel_planejamento: novaObservacao.nivel_planejamento || null,
        nivel_pratica: novaObservacao.nivel_pratica || null,
        evidencias_planejamento: novaObservacao.evidencias_planejamento || null,
        evidencias_pratica: novaObservacao.evidencias_pratica || null,
        criterio1_nivel: novaObservacao.criterio1_nivel || null,
        criterio1_evidencias: novaObservacao.criterio1_evidencias || null,
        criterio2_nivel: novaObservacao.criterio2_nivel || null,
        criterio2_evidencias: novaObservacao.criterio2_evidencias || null,
        escala_boas_praticas: novaObservacao.escala_boas_praticas || null,
        etapas_nao_realizadas: novaObservacao.etapas_nao_realizadas_str || null,
        justificativa_etapas: novaObservacao.justificativa_etapas || null,
        questionamentos_propositivos: novaObservacao.questionamentos_propositivos || null,
        proposicoes_sugestoes: novaObservacao.proposicoes_sugestoes || null,
        combinados: novaObservacao.combinados || null,
        justificativa_nao_realizada: novaObservacao.justificativa_nao_realizada || null
      };

      const { data, error } = await supabase
        .from('observacoes_pratica')
        .insert([payloadSupabase]);

      if (error) {
        console.warn('Aviso Supabase insert:', error.message);
      } else {
        resultados.supabase = true;
      }
    } catch (err) {
      console.warn('Falha na inserção do Supabase:', err);
    }
  }

  // 3. Envio para o Google Apps Script (Alimentando a planilha oficial do Google Forms)
  const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL || '';
  if (appsScriptUrl && appsScriptUrl.startsWith('http')) {
    try {
      await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors', // Evita bloqueio de CORS do Google Apps Script
        body: JSON.stringify({
          action: 'inserir_observacao_pratica',
          dados: novaObservacao
        })
      });
      resultados.googleSheets = true;
    } catch (err) {
      console.warn('Aviso Apps Script POST:', err);
    }
  }

  return {
    ...novaObservacao,
    _syncStatus: resultados
  };
}

/**
 * Retorna observações adicionais criadas localmente para mesclar com a base
 */
export function getObservacoesLocaisNovas() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}
