import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  if (!firebaseConfig.firestoreDatabaseId) {
    console.error("CRITICAL ERROR: firestoreDatabaseId is missing from firebase-applet-config.json");
    // Fallback to the known ID just in case Vite cached the old JSON
    (firebaseConfig as any).firestoreDatabaseId = "ai-studio-ebf7fabd-0d29-4956-b2cc-835a0409d727";
  }

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  storage = getStorage(app);
} catch (error) {
  console.error("CRITICAL ERROR: Failed to initialize Firebase.", error);
  throw new Error(`Falha crítica na inicialização do Firebase: ${(error as Error).message}. Verifique sua conexão e configurações.`, { cause: error });
}

export { app, auth, db, storage };
