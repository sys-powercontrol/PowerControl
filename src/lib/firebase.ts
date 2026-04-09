import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

if (!firebaseConfig.firestoreDatabaseId) {
  console.error("CRITICAL ERROR: firestoreDatabaseId is missing from firebase-applet-config.json");
  // Fallback to the known ID just in case Vite cached the old JSON
  (firebaseConfig as any).firestoreDatabaseId = "ai-studio-ebf7fabd-0d29-4956-b2cc-835a0409d727";
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
