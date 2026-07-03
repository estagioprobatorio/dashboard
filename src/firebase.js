import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Credenciais do Firebase.
// Substitua pelos valores reais do seu projeto ou configure as variáveis de ambiente na Vercel.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Verifica se as credenciais mínimas foram preenchidas
const isConfigured = firebaseConfig.databaseURL && firebaseConfig.projectId;

let app;
let database = null;
let auth = null;
const googleProvider = new GoogleAuthProvider();

// Configura o provedor do Google para solicitar conta sempre que necessário
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    database = getDatabase(app);
    auth = getAuth(app);
    console.log("Firebase conectado (Database + Auth)!");
  } catch (error) {
    console.error("Falha ao inicializar o Firebase:", error);
  }
} else {
  console.log("Firebase não configurado. Autenticação e Sincronização rodando em modo Simulado/Local.");
}

export { database, auth, googleProvider, isConfigured };
