/**
 * CENTRALIZADOR DE CARREGAMENTO DO BUNDLE (SINGLETON EM MEMÓRIA)
 * Evita requisições duplicadas e reaproveita o pacote de dados entre componentes.
 */
import { tidbService } from './tidbService';

let inFlightPromise = null;
let memoryCachedBundle = null;
let lastLoadedKey = null;

/**
 * Carrega o pacote consolidado de dados (bundle) garantindo:
 * 1. Uma única requisição em voo (in-flight deduplication) - se 2 ou mais componentes
 *    chamarem loadBundle() simultaneamente, recebem exatamente a mesma Promise.
 * 2. Cache em memória durante a sessão - chamadas subsequentes não refazem o fetch
 *    a menos que forceRefresh seja explicitamente true.
 */
export async function loadBundle(options = {}) {
  const { forceRefresh = false, userEmail = null } = options;
  const currentKey = userEmail ? String(userEmail).trim().toLowerCase() : 'anon';

  // Se não foi forçado o refresh e já temos os dados em memória para este perfil, reaproveita
  if (!forceRefresh && memoryCachedBundle && (!userEmail || lastLoadedKey === currentKey || lastLoadedKey === 'anon')) {
    return memoryCachedBundle;
  }

  // Se já houver uma requisição em andamento, retorna a Promise existente sem duplicar fetch
  if (inFlightPromise) {
    console.log('[bundleLoader] Requisição de bundle já em andamento. Aguardando Promise compartilhada...');
    return inFlightPromise;
  }

  // Cria a Promise compartilhada
  inFlightPromise = (async () => {
    try {
      console.log(`[bundleLoader] Iniciando busca centralizada do bundle (perfil: ${currentKey})...`);
      const pacote = await tidbService.executarCargaBundle(options);
      if (pacote && (pacote.baseCursistas || pacote.total_cursistas || pacote.funcao)) {
        memoryCachedBundle = pacote;
        lastLoadedKey = currentKey;
      }
      return pacote;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

/**
 * Obtém o bundle atualmente mantido em memória, se disponível
 */
export function getLoadedBundleSync() {
  return memoryCachedBundle;
}

/**
 * Invalida o cache em memória (ex.: ao deslogar ou salvar nova movimentação)
 */
export function clearBundleMemoryCache() {
  memoryCachedBundle = null;
  lastLoadedKey = null;
  inFlightPromise = null;
}
