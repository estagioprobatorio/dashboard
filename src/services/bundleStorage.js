/**
 * ARMAZENAMENTO RESILIENTE DO BUNDLE EM INDEXEDDB
 * Suporta payloads de 5 MB+ sem as limitações do localStorage.
 */

const DB_NAME = 'EP_DASHBOARD_DB';
const DB_VERSION = 1;
const STORE_NAME = 'bundle_cache';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB não suportado neste navegador.'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error || new Error('Falha ao abrir IndexedDB'));
  });
}

/**
 * Recupera o bundle do IndexedDB se a versão for compatível.
 */
export async function getStoredBundle(userKey = 'anon', expectedVersion = null) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(userKey || 'anon');
      req.onsuccess = () => {
        const entry = req.result;
        if (!entry || !entry.data) return resolve(null);
        // Se temos versão esperada e for diferente, o cache expirou
        if (expectedVersion && entry.version && entry.version !== expectedVersion) {
          console.log(`[IndexedDB] Cache local desatualizado (cache: ${entry.version} vs remoto: ${expectedVersion}).`);
          return resolve(null);
        }
        console.log(`[IndexedDB] Bundle recuperado do cache local com sucesso (versão: ${entry.version || 'antiga'}).`);
        resolve(entry.data);
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[IndexedDB] Leitura falhou, acionando fallback de rede:', err.message);
    return null;
  }
}

/**
 * Salva o bundle no IndexedDB com chave de versão.
 */
export async function saveStoredBundle(userKey = 'anon', version = 'v1', data = {}) {
  if (!data) return false;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ version, timestamp: Date.now(), data }, userKey || 'anon');
      tx.oncomplete = () => {
        console.log(`[IndexedDB] Bundle persistido com sucesso (versão: ${version}).`);
        resolve(true);
      };
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[IndexedDB] Não foi possível persistir no IndexedDB:', err.message);
    return false;
  }
}

/**
 * Limpa todos os dados armazenados no IndexedDB.
 */
export async function clearStoredBundle() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}
