import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Credenciais oficiais do Firebase (Auth Google Institucional)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBAjqByhq_pHyfBOgG8kBWX4yTVQIbzVzA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dashboard-ep.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://dashboard-ep-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dashboard-ep",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dashboard-ep.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "579653438719",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:579653438719:web:06291af202ae21314390ca"
};

// Verifica se as credenciais mínimas foram preenchidas
const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app;
let database = null;
let auth = null;
const googleProvider = new GoogleAuthProvider();

// Configura o provedor do Google para solicitar conta e restringir domínio institucional
googleProvider.setCustomParameters({
  prompt: 'select_account',
  hd: 'escola.pr.gov.br' // Sugere automaticamente a conta @escola.pr.gov.br no seletor de contas do Google
});

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    if (firebaseConfig.databaseURL) {
      try {
        database = getDatabase(app);
      } catch (dbErr) {}
    }
    auth = getAuth(app);
    console.log("[Firebase] Autenticação Google oficial inicializada (dashboard-ep)!");
  } catch (error) {
    console.error("[Firebase] Falha ao inicializar o Firebase Auth:", error);
  }
} else {
  console.log("[Firebase] Firebase não configurado.");
}

export { database, auth, googleProvider, isConfigured };
