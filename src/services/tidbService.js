/**
 * SERVIÇO DE INTEGRAÇÃO COM TiDB SERVERLESS CLOUD
 * SEED-PR - Estágio Probatório
 * ------------------------------------------------
 * Comunicação de alta performance com TiDB via Vercel Serverless Function (/api/tidb)
 * e cache local resiliente para carregamento instantâneo.
 */

import fallbackData from '../data_fallback.json';
import fallbackTutores from '../tutores_fallback.json';
import fallbackObservacoes from '../observacoes_fallback.json';
import fallbackConcluintes from '../concluintes_fallback.json';
import { driveDataService } from './driveDataService';

const CACHE_KEY = 'ep_tidb_cached_bundle';

export const tidbService = {
  /**
   * Carrega todos os dados consolidados do TiDB Cloud
   */
  carregarPacoteGeral: async () => {
    // 1. Tenta carregar do endpoint Serverless /api/tidb
    try {
      console.log('[TiDB Service] Buscando base consolidada do TiDB Cloud...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const response = await fetch('/api/tidb?action=bundle', {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const pacote = await response.json();
        if (pacote && (pacote.baseCursistas?.length > 0 || pacote.total_cursistas > 0)) {
          console.log(`[TiDB Service] ${pacote.total_cursistas || pacote.baseCursistas?.length} cursistas e ${pacote.observacoes?.length || 0} observações carregados do TiDB Cloud!`);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(pacote));
            localStorage.setItem('ep_tidb_last_sync', new Date().toISOString());
          } catch (storageErr) {}
          return pacote;
        }
      }
    } catch (err) {
      console.warn('[TiDB Service] Endpoint /api/tidb indisponível ou em carregamento local:', err.message);
    }

    // 2. Tenta recuperar do Cache Local persistido do TiDB
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const pacoteCache = JSON.parse(cached);
        console.log('[TiDB Service] Dados carregados do Cache Local persistido.');
        return pacoteCache;
      }
    } catch (cacheErr) {}

    // 3. Fallback inteligente para o Google Drive / Apps Script ou Fallback Local
    console.log('[TiDB Service] Ativando fallback para Drive / Arquivos Locais.');
    return driveDataService.carregarPacoteGeral();
  },

  /**
   * Salva uma nova observação pedagógica no TiDB
   */
  salvarObservacao: async (novaObs) => {
    try {
      const res = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert_observacao',
          data: novaObs
        })
      });
      return res.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao salvar observação no TiDB:', e);
      return false;
    }
  },

  /**
   * Atualiza ou insere um cursista no TiDB (Painel Admin)
   */
  atualizarCursista: async (record) => {
    try {
      const res = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_cursista',
          data: record
        })
      });
      return res.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao atualizar cursista no TiDB:', e);
      return false;
    }
  },

  /**
   * Remove um cursista no TiDB (Painel Admin)
   */
  deletarCursista: async (record) => {
    try {
      const res = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_cursista',
          cgm: record.cgm,
          cod_cursista: record.cod_cursista
        })
      });
      return res.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao deletar cursista no TiDB:', e);
      return false;
    }
  },

  /**
   * Registra uma movimentação / chamado no TiDB
   */
  salvarMovimentacao: async (mov) => {
    try {
      const res = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert_movimentacao',
          data: mov
        })
      });
      return res.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao salvar movimentação no TiDB:', e);
      return false;
    }
  },

  /**
   * Atualiza o status de uma movimentação (Deferido / Indeferido)
   */
  atualizarStatusMovimentacao: async (id, status, notaResolucao) => {
    try {
      const res = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_movimentacao',
          id,
          status,
          nota_resolucao: notaResolucao
        })
      });
      return res.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao atualizar status no TiDB:', e);
      return false;
    }
  },

  /**
   * Remove uma movimentação / chamado do TiDB
   */
  deletarMovimentacao: async (id) => {
    try {
      const res = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_movimentacao',
          id
        })
      });
      return res.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao deletar movimentação no TiDB:', e);
      return false;
    }
  },

  /**
   * Insere um registro no Diário Formativo
   */
  salvarDiario: async (entry) => {
    try {
      const res = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert_diario',
          data: entry
        })
      });
      return res.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao salvar diário no TiDB:', e);
      return false;
    }
  },

  /**
   * Registra intenção de matrícula 2027
   */
  salvarIntencao2027: async (entry) => {
    try {
      const res = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert_intencao',
          data: entry
        })
      });
      return res.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao salvar intenção no TiDB:', e);
      return false;
    }
  }
};
