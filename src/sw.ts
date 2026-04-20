/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { openDB } from 'idb';
import { inventory } from './lib/inventory';
import { SaleItem, User } from './types';

declare let self: ServiceWorkerGlobalScope;

interface SyncEvent extends ExtendableEvent {
  readonly lastChance: boolean;
  readonly tag: string;
}

interface PendingSale {
  id: string;
  saleData: Record<string, unknown>;
  items: SaleItem[];
  userContext: User;
  retryCount?: number;
}

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

self.addEventListener('sync', ((event: SyncEvent) => {
  if (event.tag === 'sync-sales') {
    event.waitUntil(syncSales());
  }
}) as EventListener);

async function syncSales() {
  try {
    const db = await openDB(DB_NAME, 1);
    const pendingSales: PendingSale[] = await db.getAll(STORE_NAME);

    if (pendingSales.length === 0) return;

    let syncedCount = 0;
    let failedCount = 0;
    let abandonedCount = 0;

    const MAX_RETRIES = 3;

    for (const sale of pendingSales) {
      try {
        await inventory.processSale(sale.saleData, sale.items, sale.userContext);
        await db.delete(STORE_NAME, sale.id);
        syncedCount++;
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Erro ao sincronizar venda no SW:", error.message);
        }
        
        let retries = sale.retryCount || 0;
        retries++;
        
        if (retries >= MAX_RETRIES) {
          console.error(`Venda ${sale.id} atingiu limite de tentativas e será abandonada.`);
          await db.delete(STORE_NAME, sale.id);
          abandonedCount++;
        } else {
          sale.retryCount = retries;
          await db.put(STORE_NAME, sale);
          failedCount++;
        }
      }
    }

    const allClients = await self.clients.matchAll({ type: 'window' });
    for (const client of allClients) {
      client.postMessage({ 
        type: 'SYNC_COMPLETED',
        payload: {
          synced: syncedCount,
          failed: failedCount,
          abandoned: abandonedCount
        }
      });
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Erro geral no syncSales do SW:", err.message);
      const allClients = await self.clients.matchAll({ type: 'window' });
      for (const client of allClients) {
        client.postMessage({ 
          type: 'SYNC_ERROR',
          payload: { error: err.message }
        });
      }
    }
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_SYNC') {
    syncSales();
  }
});
