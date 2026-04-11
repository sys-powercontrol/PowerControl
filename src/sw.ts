/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { openDB } from 'idb';
import { inventory } from './lib/inventory';

declare let self: ServiceWorkerGlobalScope;

// Precache assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST || []);

const DB_NAME = "powercontrol_offline_db";
const STORE_NAME = "sales";

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-sales') {
    event.waitUntil(syncSales());
  }
});

async function syncSales() {
  try {
    const db = await openDB(DB_NAME, 1);
    const pendingSales = await db.getAll(STORE_NAME);

    if (pendingSales.length === 0) return;

    for (const sale of pendingSales) {
      try {
        await inventory.processSale(sale.saleData, sale.items, sale.userContext);
        await db.delete(STORE_NAME, sale.id);
      } catch (error) {
        console.error("Erro ao sincronizar venda no SW:", error);
      }
    }

    const allClients = await self.clients.matchAll({ type: 'window' });
    for (const client of allClients) {
      client.postMessage({ type: 'SYNC_COMPLETED' });
    }
  } catch (err) {
    console.error("Erro geral no syncSales do SW:", err);
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_SYNC') {
    syncSales();
  }
});
