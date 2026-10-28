/**
 * SERVIÇO DE SINCRONIZAÇÃO VIA GOOGLE DRIVE & GOOGLE APPS SCRIPT
 * -------------------------------------------------------------
 * Substitui o Supabase por leitura direta do JSON consolidado no Google Drive
 * e gravação instantânea na Planilha Google Mestra via Google Apps Script.
 * 
 * Zero Supabase · Zero Custos · Resiliência com Cache Local
 */

import fallbackData from '../data_fallback.json';
import fallbackTutores from '../tutores_fallback.json';
import fallbackObservacoes from '../observacoes_fallback.json';
import fallbackConcluintes from '../concluintes_fallback.json';

const CACHE_KEY = 'ep_drive_cached_bundle';

export const getAppsScriptUrl = () => {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APPS_SCRIPT_URL) ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('ep_apps_script_url') : '') ||
    ''
  ).trim();
};

export const setAppsScriptUrl = (url) => {
  if (typeof localStorage !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('ep_apps_script_url', url.trim());
    } else {
      localStorage.removeItem('ep_apps_script_url');
    }
  }
};

export const driveDataService = {
  /**
   * Carrega o pacote consolidado gerado pela planilha e salvo no Google Drive
   */
  carregarPacoteGeral: async () => {
    // 1. Tenta carregar do endpoint do Apps Script (que lê o JSON do Drive em tempo real)
    const appsScriptUrl = getAppsScriptUrl();
    if (appsScriptUrl && appsScriptUrl.startsWith('http')) {
      try {
        console.log('[DriveService] Buscando base consolidada do Google Drive via Apps Script...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        const response = await fetch(appsScriptUrl, {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const pacote = await response.json();
          if (pacote && (pacote.baseCursistas || Array.isArray(pacote))) {
            console.log('[DriveService] Dados do Google Drive carregados com sucesso!');
            // Armazena no cache local para resposta instantânea em acessos futuros
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify(pacote));
              localStorage.setItem('ep_drive_last_sync', new Date().toISOString());
            } catch (storageErr) {
              console.warn('[DriveService] Cache local cheio ou inacessível:', storageErr);
            }
            return pacote;
          }
        }
      } catch (err) {
        console.warn('[DriveService] Falha ao carregar do Drive online, ativando cache/fallback:', err);
      }
    }

    // 2. Se falhar ou offline, tenta carregar do Cache Local persistido
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const pacoteCache = JSON.parse(cached);
        console.log('[DriveService] Dados carregados do Cache Local persistido.');
        return pacoteCache;
      }
    } catch (cacheErr) {
      console.warn('[DriveService] Erro ao ler cache local:', cacheErr);
    }

    // 3. Fallback de Segurança caso seja o primeiro acesso e esteja sem conexão
    console.log('[DriveService] Usando dados locais de contingência (fallback).');
    return {
      atualizado_em: 'Local Fallback',
      total_cursistas: fallbackData.length,
      baseCursistas: fallbackData,
      tutores: fallbackTutores,
      concluintes: fallbackConcluintes,
      observacoes: fallbackObservacoes,
      intencoes2027: [],
      movimentacoes: []
    };
  },

  /**
   * Envia uma nova Observação de Prática para gravação na Planilha Mestra
   */
  salvarObservacaoPratica: async (novaObs) => {
    const appsScriptUrl = getAppsScriptUrl();
    if (appsScriptUrl && appsScriptUrl.startsWith('http')) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'inserir_observacao_pratica',
            dados: novaObs
          })
        });
        console.log('[DriveService] Observação enviada para o Google Sheets.');
      } catch (err) {
        console.error('[DriveService] Erro ao enviar observação para Apps Script:', err);
      }
    }

    // Salva cópia local
    try {
      const locais = JSON.parse(localStorage.getItem('ep_observacoes_locais_novas') || '[]');
      locais.unshift(novaObs);
      localStorage.setItem('ep_observacoes_locais_novas', JSON.stringify(locais));
    } catch (e) {}

    return { status: 'sucesso', observacao: novaObs };
  },

  /**
   * Envia a Intenção de Vagas 2027 para a Planilha Mestra
   */
  salvarIntencao2027: async (dadosIntencao) => {
    const appsScriptUrl = getAppsScriptUrl();
    if (appsScriptUrl && appsScriptUrl.startsWith('http')) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'salvar_intencao_2027',
            dados: dadosIntencao
          })
        });
        console.log('[DriveService] Intenção 2027 enviada para o Google Sheets.');
      } catch (err) {
        console.error('[DriveService] Erro ao enviar intenção para Apps Script:', err);
      }
    }

    // Salva cópia local
    try {
      const key = dadosIntencao.cgm_cursista 
        ? `intencao_2027_cgm_${dadosIntencao.cgm_cursista}` 
        : `intencao_2027_${dadosIntencao.email_cursista}`;
      localStorage.setItem(key, JSON.stringify(dadosIntencao));

      const lista = JSON.parse(localStorage.getItem('intencoes_2027_todas') || '[]');
      const filtrada = lista.filter(item => 
        String(item.cgm_cursista) !== String(dadosIntencao.cgm_cursista) && 
        item.email_cursista !== dadosIntencao.email_cursista
      );
      filtrada.unshift(dadosIntencao);
      localStorage.setItem('intencoes_2027_todas', JSON.stringify(filtrada));
    } catch (e) {}

    return { status: 'sucesso', dados: dadosIntencao };
  },

  /**
   * Envia Remanejamento ou Edição de Cursista para a Planilha Mestra
   */
  salvarRemanejamento: async (dadosRemanejamento, turmaAnterior = null, tipoRem = 'comum') => {
    const appsScriptUrl = getAppsScriptUrl();
    if (appsScriptUrl && appsScriptUrl.startsWith('http')) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'salvar_remanejamento',
            dados: dadosRemanejamento,
            turma_anterior: turmaAnterior,
            tipo_remanejamento: tipoRem
          })
        });
        console.log('[DriveService] Remanejamento enviado para o Google Sheets.');
      } catch (err) {
        console.error('[DriveService] Erro ao enviar remanejamento para Apps Script:', err);
      }
    }

    return { status: 'sucesso', dados: dadosRemanejamento };
  },

  /**
   * Registra Exoneração de Cursista na Planilha Mestra
   */
  exonerarCursista: async (cpf, nome, motivo) => {
    const appsScriptUrl = getAppsScriptUrl();
    if (appsScriptUrl && appsScriptUrl.startsWith('http')) {
      try {
        await fetch(appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'exonerar_cursista',
            dados: { cpf, nome, motivo }
          })
        });
        console.log('[DriveService] Exoneração enviada para o Google Sheets.');
      } catch (err) {
        console.error('[DriveService] Erro ao registrar exoneração no Apps Script:', err);
      }
    }

    return { status: 'sucesso' };
  }
};
