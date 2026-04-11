import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = !admin.apps.length 
  ? admin.initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket
    })
  : admin.app();

export const adminDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const adminStorage = admin.storage(app);
export const adminAuth = admin.auth(app);
