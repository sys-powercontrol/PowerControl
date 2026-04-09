// Service Worker for Background Sync
importScripts('https://cdn.jsdelivr.net/npm/idb@7/build/umd/index.js');

const DB_NAME = "powercontrol_offline_db";
const STORE_NAME = "sales";

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sales') {
    event.waitUntil(syncSales());
  }
});

async function syncSales() {
  const db = await idb.openDB(DB_NAME, 1);
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const pendingSales = await store.getAll();

  if (pendingSales.length === 0) return;

  // Since we can't easily use the full Firestore SDK here without bundling,
  // we notify any open clients to perform the sync.
  // If no clients are open, the sync will happen when the app is next opened.
  const allClients = await clients.matchAll({ type: 'window' });
  
  if (allClients.length > 0) {
    for (const client of allClients) {
      client.postMessage({ type: 'TRIGGER_SYNC' });
    }
  } else {
    // If no clients are open, we could potentially use a Fetch API if we had a REST endpoint.
    // For now, we rely on the app syncing when it's opened.
    console.log('Background sync triggered, but no open clients to perform Firestore operations.');
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_SYNC') {
    syncSales();
  }
});
