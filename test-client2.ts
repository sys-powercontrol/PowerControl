import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

const app = initializeApp(firebaseConfig);

async function testConnection(dbId?: string) {
  try {
    console.log(`Testing client connection to: ${dbId || "(default)"}`);
    const db = getFirestore(app, dbId);
    const docRef = doc(db, "users", "test-uid");
    await getDoc(docRef);
    console.log("Success!");
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

async function run() {
  await testConnection();
  await testConnection("ai-studio-ebf7fabd-0d29-4956-b2cc-835a0409d727");
  await testConnection("db-final-v22");
  process.exit(0);
}

run();
