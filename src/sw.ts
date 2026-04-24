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

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('sync', ((event: SyncEvent) => {
  if (event.tag === 'sync-sales') {
    event.waitUntil(syncSales());
  } else if (event.tag === 'sync-clients') {
    event.waitUntil(syncGenericEntities(STORE_CLIENTS, async (entity) => {
      await api.post("clients", entity.data);
    }));
  } else if (event.tag === 'sync-accounts-payable') {
    event.waitUntil(syncGenericEntities(STORE_ACCOUNTS_PAYABLE, async (entity) => {
      await api.post("accountsPayable", entity.data);
    }));
  } else if (event.tag === 'sync-purchases') {
    event.waitUntil(syncGenericEntities(STORE_PURCHASES, async (entity) => {
      await inventory.processPurchase(entity.data, entity.items || [], entity.userContext);
    }));
  }
}) as EventListener);

async function syncSales() {
  try {
    const db = await openDB(DB_NAME, 2);
    const pendingSales: PendingSale[] = await db.getAll(STORE_SALES);

    if (pendingSales.length === 0) return;

    let syncedCount = 0;
    let failedCount = 0;
    let abandonedCount = 0;

    const MAX_RETRIES = 3;

    for (const sale of pendingSales) {
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
          await db.put(STORE_SALES, sale);
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

async function syncGenericEntities(storeName: string, processFunction: (entity: any) => Promise<void>) {
  try {
    const db = await openDB(DB_NAME, 2);
    const pendingEntities = await db.getAll(storeName);

    if (pendingEntities.length === 0) return;

    let syncedCount = 0;
    let failedCount = 0;
    let abandonedCount = 0;
    const MAX_RETRIES = 3;

    for (const entity of pendingEntities) {
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
          await db.put(storeName, entity);
          failedCount++;
        }
      }
    }

    const allClients = await self.clients.matchAll({ type: 'window' });
    for (const client of allClients) {
      if (syncedCount > 0 || failedCount > 0 || abandonedCount > 0) {
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
    if (err instanceof Error) {
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
    syncGenericEntities(STORE_CLIENTS, async (entity) => {
      await api.post("clients", entity.data);
    });
    syncGenericEntities(STORE_ACCOUNTS_PAYABLE, async (entity) => {
      await api.post("accountsPayable", entity.data);
    });
    syncGenericEntities(STORE_PURCHASES, async (entity) => {
      await inventory.processPurchase(entity.data, entity.items || [], entity.userContext);
    });
  }
});
