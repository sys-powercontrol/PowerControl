/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { openDB } from 'idb';
import { inventory } from './lib/inventory';
import { api } from './lib/api';
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
const STORE_SALES = "sales";
const STORE_CLIENTS = "clients";
const STORE_ACCOUNTS_PAYABLE = "accounts_payable";
const STORE_PURCHASES = "purchases";

const HEARTBEAT_INTERVAL = 60000; // 1 minute
const BASE_BACKOFF = 2000; // 2 seconds

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  startHeartbeat();
});

function startHeartbeat() {
  setInterval(async () => {
    console.log("SW Heartbeat: Checking for pending data...");
    await runAllSyncs();
  }, HEARTBEAT_INTERVAL);
}

async function runAllSyncs() {
  await syncSales();
  await syncGenericEntities(STORE_CLIENTS, async (entity) => {
    await api.post("clients", entity.data);
  });
  await syncGenericEntities(STORE_ACCOUNTS_PAYABLE, async (entity) => {
    await api.post("accountsPayable", entity.data);
  });
  await syncGenericEntities(STORE_PURCHASES, async (entity) => {
    await inventory.processPurchase(entity.data, entity.items || [], entity.userContext);
  });
}

function shouldRetry(retryCount: number = 0, lastAttempt: number = 0): boolean {
  if (retryCount === 0) return true;
  const now = Date.now();
  const waitTime = Math.min(Math.pow(2, retryCount) * BASE_BACKOFF, 3600000); // Max 1 hour
  return now - lastAttempt >= waitTime;
}

async function syncSales() {
  try {
    const db = await openDB(DB_NAME, 2);
    const pendingSales: PendingSale[] = await db.getAll(STORE_SALES);

    if (pendingSales.length === 0) return;

    let syncedCount = 0;
    let failedCount = 0;
    let abandonedCount = 0;

    const MAX_RETRIES = 10; // Increased because of exponential backoff

    for (const sale of pendingSales) {
      if (!shouldRetry(sale.retryCount, (sale as any).lastAttempt)) continue;

      try {
        await inventory.processSale(sale.saleData, sale.items, sale.userContext);
        await db.delete(STORE_SALES, sale.id);
        syncedCount++;
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Erro ao sincronizar venda no SW:", error.message);
        }
        
        let retries = sale.retryCount || 0;
        retries++;
        
        if (retries >= MAX_RETRIES) {
          console.error(`Venda ${sale.id} atingiu limite de tentativas e será abandonada.`);
          await db.delete(STORE_SALES, sale.id);
          abandonedCount++;
        } else {
          sale.retryCount = retries;
          (sale as any).lastAttempt = Date.now();
          await db.put(STORE_SALES, sale);
          failedCount++;
        }
      }
    }

    if (syncedCount > 0 || failedCount > 0 || abandonedCount > 0) {
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
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Erro geral no syncSales do SW:", err.message);
    }
  }
}

async function syncGenericEntities(storeName: string, processFunction: (entity: any) => Promise<void>) {
  try {
    const db = await openDB(DB_NAME, 2);
    const pendingEntities = await db.getAll(storeName);

    if (pendingEntities.length === 0) return;

    let syncedCount = 0;
    let failedCount = 0;
    let abandonedCount = 0;
    const MAX_RETRIES = 10;

    for (const entity of pendingEntities) {
      if (!shouldRetry(entity.retryCount, entity.lastAttempt)) continue;

      try {
        await processFunction(entity);
        await db.delete(storeName, entity.id);
        syncedCount++;
      } catch (error: unknown) {
        console.error(`Erro ao sincronizar no SW (${storeName}):`, error);
        
        let retries = entity.retryCount || 0;
        retries++;
        
        if (retries >= MAX_RETRIES) {
          console.error(`Entidade ${entity.id} atingiu limite de tentativas e será abandonada.`);
          await db.delete(storeName, entity.id);
          abandonedCount++;
        } else {
          entity.retryCount = retries;
          entity.lastAttempt = Date.now();
          await db.put(storeName, entity);
          failedCount++;
        }
      }
    }

    if (syncedCount > 0 || failedCount > 0 || abandonedCount > 0) {
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
    }
  } catch (err: unknown) {
    console.error(`Erro geral no sync SW (${storeName}):`, err);
  }
}

self.addEventListener('sync', ((event: SyncEvent) => {
  if (event.tag === 'sync-sales' || event.tag === 'sync-clients' || event.tag === 'sync-accounts-payable' || event.tag === 'sync-purchases') {
    event.waitUntil(runAllSyncs());
  }
}) as EventListener);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_SYNC') {
    runAllSyncs();
  }
});
