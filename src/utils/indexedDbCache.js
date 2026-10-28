/**
 * Cache Persistente em IndexedDB para reduzir drasticamente o Egress (tráfego de rede)
 * e garantir carregamento instantâneo mesmo offline ou com Supabase em overquota (HTTP 402).
 */

const DB_NAME = 'seed_pr_estagio_probatorio_cache';
const DB_VERSION = 1;
const STORE_NAME = 'datasets';

// Tempo padrão de validade do cache antes de tentar buscar delta na nuvem (30 minutos)
export const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000;

function openCacheDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste ambiente.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Lê um conjunto de dados do IndexedDB
 * @param {string} key Chave do dataset ('cursistas', 'observacoes_pratica', 'tutores', 'concluintes', 'movimentacoes')
 * @returns {Promise<{ data: any, updatedAt: number, isExpired: boolean } | null>}
 */
export async function getCachedDataset(key, ttlMs = DEFAULT_CACHE_TTL_MS) {
  try {
    const db = await openCacheDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const result = req.result;
        if (!result || !result.data) {
          resolve(null);
          return;
        }
        const age = Date.now() - (result.updatedAt || 0);
        resolve({
          data: result.data,
          updatedAt: result.updatedAt || 0,
          isExpired: age > ttlMs
        });
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`Aviso ao ler cache IndexedDB (${key}):`, err);
    return null;
  }
}

/**
 * Salva um conjunto de dados no IndexedDB
 * @param {string} key Chave do dataset
 * @param {any} data Dados a serem armazenados
 */
export async function setCachedDataset(key, data) {
  try {
    const db = await openCacheDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        key,
        data,
        updatedAt: Date.now()
      });

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`Aviso ao salvar cache IndexedDB (${key}):`, err);
    return false;
  }
}

/**
 * Persiste edições administrativas locais de cursistas no LocalStorage
 * para que remanejamentos e edições funcionem mesmo sem Supabase ativo.
 */
const LOCAL_CURSISTAS_EDITS_KEY = 'ep_cursistas_edits_locais';
const LOCAL_CURSISTAS_DELETES_KEY = 'ep_cursistas_deletes_locais';

export function saveLocalCursistaEdit(record, oldKey = null) {
  try {
    const edits = JSON.parse(localStorage.getItem(LOCAL_CURSISTAS_EDITS_KEY) || '{}');
    if (oldKey) {
      delete edits[oldKey];
    }
    const newKey = `${record.cgm || record.cod_cursista}_${record.turmas || record.turma || ''}`;
    edits[newKey] = {
      ...record,
      _localUpdatedAt: new Date().toISOString()
    };
    localStorage.setItem(LOCAL_CURSISTAS_EDITS_KEY, JSON.stringify(edits));
  } catch (e) {
    console.warn('Erro ao salvar edição local de cursista:', e);
  }
}

export function saveLocalCursistaDelete(record) {
  try {
    const deletes = JSON.parse(localStorage.getItem(LOCAL_CURSISTAS_DELETES_KEY) || '[]');
    const key = String(record.cgm || record.cod_cursista || '').trim();
    if (key && !deletes.includes(key)) {
      deletes.push(key);
      localStorage.setItem(LOCAL_CURSISTAS_DELETES_KEY, JSON.stringify(deletes));
    }
  } catch (e) {
    console.warn('Erro ao salvar exclusão local de cursista:', e);
  }
}

export function applyLocalCursistaOverrides(baseRecords) {
  try {
    const edits = JSON.parse(localStorage.getItem(LOCAL_CURSISTAS_EDITS_KEY) || '{}');
    const deletes = new Set(JSON.parse(localStorage.getItem(LOCAL_CURSISTAS_DELETES_KEY) || '[]'));

    let result = baseRecords.filter(r => {
      const k = String(r.cgm || r.cod_cursista || '').trim();
      return !deletes.has(k);
    });

    const editEntries = Object.values(edits);
    if (editEntries.length > 0) {
      const editMapByCgm = new Map();
      editEntries.forEach(ed => {
        const cgmKey = String(ed.cgm || ed.cod_cursista || '').trim();
        if (cgmKey) editMapByCgm.set(cgmKey, ed);
      });

      const matchedCgms = new Set();
      result = result.map(r => {
        const cgmKey = String(r.cgm || r.cod_cursista || '').trim();
        if (cgmKey && editMapByCgm.has(cgmKey)) {
          matchedCgms.add(cgmKey);
          return { ...r, ...editMapByCgm.get(cgmKey) };
        }
        return r;
      });

      editEntries.forEach(ed => {
        const cgmKey = String(ed.cgm || ed.cod_cursista || '').trim();
        if (cgmKey && !matchedCgms.has(cgmKey)) {
          result.push(ed);
        }
      });
    }

    return result;
  } catch (e) {
    return baseRecords;
  }
}
