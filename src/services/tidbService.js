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
import { auth } from '../firebase';
import { loadBundle } from './bundleLoader';

const CACHE_KEY = 'ep_tidb_cached_bundle';

async function getAuthHeaders() {
  const headers = { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' };
  try {
    if (auth && auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } else {
      const saved = localStorage.getItem('ep_user_session');
      if (saved) {
        const u = JSON.parse(saved);
        if (u && u.email) {
          headers['Authorization'] = `Bearer dev:${u.email}`;
        }
      }
    }
  } catch (e) {}
  return headers;
}

export const tidbService = {
  /**
   * Carrega todos os dados consolidados (API v2 segura com fallback para v1 e Drive)
   */
  carregarPacoteGeral: async (options) => {
    return loadBundle(options);
  },

  executarCargaBundle: async (options = {}) => {
    const authHeaders = await getAuthHeaders();

    // 1. Tenta carregar da nova API v2 (com controle de acesso, escopo por função e CGM seguro)
    try {
      console.log('[TiDB Service] Buscando base consolidada da API v2...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const respV2 = await fetch(`/api/v2?action=bundle&_t=${Date.now()}`, {
        method: 'GET',
        headers: authHeaders,
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (respV2.ok) {
        const pacote = await respV2.json();
        if (pacote && (pacote.baseCursistas?.length > 0 || pacote.total_cursistas > 0 || pacote.funcao)) {
          console.log(`[TiDB Service] [v2] Carregado com sucesso! Função: ${pacote.funcao || 'indefinida'}, ${pacote.total_cursistas || pacote.baseCursistas?.length || 0} cursistas.`);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(pacote));
            localStorage.setItem('ep_tidb_last_sync', new Date().toISOString());
          } catch (storageErr) {}
          return pacote;
        }
      }
    } catch (errV2) {
      console.warn('[TiDB Service] API v2 indisponível ou em fallback:', errV2.message);
    }

    // 2. Fallback para endpoint legado /api/tidb
    try {
      console.log('[TiDB Service] Buscando base consolidada do endpoint /api/tidb...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const response = await fetch(`/api/tidb?action=bundle&_t=${Date.now()}`, {
        method: 'GET',
        headers: authHeaders,
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const pacote = await response.json();
        if (pacote && (pacote.baseCursistas?.length > 0 || pacote.total_cursistas > 0 || pacote.exonerados?.length > 0 || pacote.concluintes?.length > 0)) {
          console.log(`[TiDB Service] ${pacote.total_cursistas || pacote.baseCursistas?.length} cursistas, ${pacote.exonerados?.length || 0} exonerados e ${pacote.observacoes?.length || 0} observações carregados do TiDB Cloud!`);
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
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/v2', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insert_observacao', data: novaObs })
      });
      if (res.ok) return true;
      // Fallback
      const resLegacy = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insert_observacao', data: novaObs })
      });
      return resLegacy.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao salvar observação:', e);
      return false;
    }
  },

  /**
   * Atualiza ou insere um cursista no TiDB (Painel Admin)
   */
  atualizarCursista: async (record) => {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/v2', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_cursista', data: record })
      });
      if (res.ok) return true;
      const resLegacy = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_cursista', data: record })
      });
      return resLegacy.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao atualizar cursista:', e);
      return false;
    }
  },

  /**
   * Remove um cursista no TiDB (Painel Admin)
   */
  deletarCursista: async (record) => {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/v2', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_cursista', cgm: record.cgm, cod_cursista: record.cod_cursista })
      });
      if (res.ok) return true;
      const resLegacy = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_cursista', cgm: record.cgm, cod_cursista: record.cod_cursista })
      });
      return resLegacy.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao deletar cursista:', e);
      return false;
    }
  },

  /**
   * Registra uma movimentação / chamado no TiDB
   */
  salvarMovimentacao: async (mov) => {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/v2', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insert_movimentacao', data: mov })
      });
      if (res.ok) return true;
      const resLegacy = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insert_movimentacao', data: mov })
      });
      return resLegacy.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao salvar movimentação:', e);
      return false;
    }
  },

  /**
   * Atualiza o status de uma movimentação (Deferido / Indeferido)
   */
  atualizarStatusMovimentacao: async (id, status, notaResolucao) => {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/v2', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_movimentacao', id, status, nota_resolucao: notaResolucao })
      });
      if (res.ok) return true;
      const resLegacy = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_movimentacao', id, status, nota_resolucao: notaResolucao })
      });
      return resLegacy.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao atualizar status:', e);
      return false;
    }
  },

  /**
   * Remove uma movimentação / chamado do TiDB
   */
  deletarMovimentacao: async (id) => {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/v2', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_movimentacao', id })
      });
      if (res.ok) return true;
      const resLegacy = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_movimentacao', id })
      });
      return resLegacy.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao deletar movimentação:', e);
      return false;
    }
  },

  /**
   * Insere um registro no Diário Formativo
   */
  salvarDiario: async (entry) => {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/v2', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insert_diario', data: entry })
      });
      if (res.ok) return true;
      const resLegacy = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insert_diario', data: entry })
      });
      return resLegacy.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao salvar diário:', e);
      return false;
    }
  },

  /**
   * Registra intenção de matrícula 2027
   */
  salvarIntencao2027: async (entry) => {
    try {
      const authHeaders = await getAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout máximo

      const res = await fetch('/api/v2?action=insert_intencao', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insert_intencao', data: entry }),
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.ok) return true;

      // Fallback legado com timeout
      const controllerLegacy = new AbortController();
      const timeoutLegacy = setTimeout(() => controllerLegacy.abort(), 6000);
      const resLegacy = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insert_intencao', data: entry }),
        signal: controllerLegacy.signal
      }).catch(() => null);
      clearTimeout(timeoutLegacy);

      return resLegacy && resLegacy.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao salvar intenção:', e);
      return false;
    }
  },

  /**
   * Limpa todos os dados de intenção de matrícula 2027 (Ação de Superadmin / Testes)
   */
  limparIntencoes2027: async () => {
    try {
      const authHeaders = await getAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('/api/v2?action=reset_intencoes_2027', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_intencoes_2027' }),
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.ok) return true;

      const resLegacy = await fetch('/api/tidb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_intencoes_2027' })
      }).catch(() => null);

      return resLegacy && resLegacy.ok;
    } catch (e) {
      console.warn('[TiDB Service] Falha ao resetar intenções:', e);
      return false;
    }
  }
};
