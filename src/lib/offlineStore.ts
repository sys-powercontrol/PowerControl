import { inventory } from "./inventory";
import { toast } from "sonner";
import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "powercontrol_offline_db";
const STORE_SALES = "sales";
const STORE_CLIENTS = "clients";
const STORE_ACCOUNTS_PAYABLE = "accounts_payable";
const STORE_PURCHASES = "purchases";
const STORE_SALES_FAILED = "sales_failed_sync";

import { api } from "./api";

export interface OfflineSale {
  id: string;
  saleData: any;
  items: any[];
  userContext?: any;
  timestamp: number;
}

export interface OfflineEntity {
  id: string;
  data: any;
  items?: any[];
  userContext?: any;
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 3, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_SALES)) {
          db.createObjectStore(STORE_SALES, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_CLIENTS)) {
          db.createObjectStore(STORE_CLIENTS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_ACCOUNTS_PAYABLE)) {
          db.createObjectStore(STORE_ACCOUNTS_PAYABLE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_PURCHASES)) {
          db.createObjectStore(STORE_PURCHASES, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_SALES_FAILED)) {
          db.createObjectStore(STORE_SALES_FAILED, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export const offlineStore = {
  // --- SALES ---
  async getPendingSales(): Promise<OfflineSale[]> {
    const db = await getDB();
    return db.getAll(STORE_SALES);
  },

  async saveSale(saleData: any, items: any[], userContext?: any) {
    const db = await getDB();
    const user = userContext || api.getCurrentUser();
    
    if (!user) {
        throw new Error("Contexto de usuário indisponível para salvar venda offline.");
    }

    const newSale: OfflineSale = {
      id: crypto.randomUUID(),
      saleData,
      items,
      userContext: user,
      timestamp: Date.now(),
    };
    await db.add(STORE_SALES, newSale);
    
    // Request background sync if supported
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-sales');
      } catch (err) {
        console.warn("Background sync registration failed:", err);
      }
    }

    toast.success("Venda salva offline! Será sincronizada quando houver conexão.");
    return newSale;
  },

  async syncSales() {
    const pending = await this.getPendingSales();
    if (pending.length === 0) return;

    toast.info(`Sincronizando ${pending.length} vendas pendentes...`);
    
    const db = await getDB();
    let successCount = 0;
    let failCount = 0;

    for (const sale of pending) {
      try {
        const salePayload = {
          ...sale.saleData,
          is_offline_sync: true,
          synced_at: new Date().toISOString()
        };
        const processedSaleData = await inventory.processSale(salePayload, sale.items, sale.userContext);
        
        await api.log({
          action: 'CREATE',
          entity: 'sales',
          entity_id: processedSaleData.id,
          description: `Venda Offline Sincronizada #${processedSaleData.id.substr(0, 8).toUpperCase()}`,
          metadata: { isOfflineSync: true, timestamp: sale.timestamp }
        }, sale.userContext);

        await db.delete(STORE_SALES, sale.id);
        successCount++;
      } catch (error: any) {
        console.error("Erro ao sincronizar venda offline:", error);
        const errMsg = error?.message || "Erro desconhecido";
        const companyId = sale.saleData?.company_id || sale.userContext?.company_id || api.getCompanyId();

        if (errMsg.toLowerCase().includes("estoque insuficiente") || errMsg.toLowerCase().includes("insuficiente")) {
          try {
            const fallbackSale = {
              ...sale.saleData,
              status: "Pendente de Estoque",
              error_reason: errMsg,
              items: sale.items,
              company_id: companyId,
              created_at: new Date(sale.timestamp || Date.now()).toISOString(),
              is_offline_sync: true
            };
            const created = await api.post("sales", fallbackSale);
            await api.log({
              action: 'CREATE',
              entity: 'sales',
              entity_id: created.id || sale.id,
              description: `Venda Offline Sincronizada com Pendência de Estoque #${(created.id || sale.id).substr(0, 8).toUpperCase()}`,
              metadata: { isOfflineSync: true, status: "Pendente de Estoque", timestamp: sale.timestamp }
            }, sale.userContext);

            if (companyId) {
              await api.post("notifications", {
                company_id: companyId,
                title: "Divergência de Estoque (Venda Offline)",
                message: `Venda para ${sale.saleData?.client_name || "Consumidor"} gravada como "Pendente de Estoque": ${errMsg}`,
                type: "warning",
                link: "/HistoricoVendas",
                read: false,
                status: "unread",
                created_at: new Date().toISOString()
              });
            }

            await db.delete(STORE_SALES, sale.id);
            failCount++;
            continue;
          } catch (pendingErr) {
            console.error("Erro ao registrar venda pendente de estoque:", pendingErr);
          }
        }

        await db.put(STORE_SALES_FAILED, { ...sale, error_reason: errMsg });
        await db.delete(STORE_SALES, sale.id);
        failCount++;

        if (companyId) {
          try {
            await api.post("notifications", {
              company_id: companyId,
              title: "Divergência de Estoque / Erro em Sync Offline",
              message: `Venda para ${sale.saleData?.client_name || "Consumidor"} falhou: ${errMsg}`,
              type: "error",
              link: "/HistoricoVendas",
              read: false,
              status: "unread",
              created_at: new Date().toISOString()
            });
          } catch (nErr) {
            console.warn("Erro ao registrar notificação de falha em sync:", nErr);
          }
        }
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} vendas sincronizadas com sucesso!`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} vendas falharam na sincronização.`);
    }
  },

  async getFailedSales(): Promise<any[]> {
    const db = await getDB();
    return db.getAll(STORE_SALES_FAILED);
  },

  async deleteFailedSale(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(STORE_SALES_FAILED, id);
  },

  async hasPendingSales(): Promise<boolean> {
    const sales = await this.getPendingSales();
    return sales.length > 0;
  },

  // --- GENERIC ENTITIES (CLIENTS, AP, PURCHASES) ---
  async getPendingEntities(storeName: string): Promise<OfflineEntity[]> {
    const db = await getDB();
    return db.getAll(storeName);
  },

  async saveEntityOffline(storeName: string, syncTag: string, data: any, items?: any[], userContext?: any) {
    const db = await getDB();
    const user = userContext || api.getCurrentUser();
    
    const newEntity: OfflineEntity = {
      id: crypto.randomUUID(),
      data,
      items,
      userContext: user,
      timestamp: Date.now(),
    };
    await db.add(storeName, newEntity);
    
    // Request background sync if supported
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register(syncTag);
      } catch (err) {
        console.warn(`Background sync registration failed for ${syncTag}:`, err);
      }
    }

    toast.success("Registro salvo offline! Será sincronizado quando houver conexão.");
    return newEntity;
  },

  async saveClient(clientData: any) {
    return this.saveEntityOffline(STORE_CLIENTS, 'sync-clients', clientData);
  },

  async saveAccountPayable(accountData: any) {
    return this.saveEntityOffline(STORE_ACCOUNTS_PAYABLE, 'sync-accounts-payable', accountData);
  },

  async savePurchase(purchaseData: any, items: any[]) {
    return this.saveEntityOffline(STORE_PURCHASES, 'sync-purchases', purchaseData, items);
  },

  async syncAllEntities() {
    this.syncSales();
    this.syncGenericEntities(STORE_CLIENTS, async (entity) => {
      await api.post("clients", entity.data);
    });
    this.syncGenericEntities(STORE_ACCOUNTS_PAYABLE, async (entity) => {
      await api.post("accountsPayable", entity.data);
    });
    this.syncGenericEntities(STORE_PURCHASES, async (entity) => {
      await inventory.processPurchase(entity.data, entity.items || [], entity.userContext);
    });
  },

  async syncGenericEntities(storeName: string, processFunction: (entity: OfflineEntity) => Promise<void>) {
    const pending = await this.getPendingEntities(storeName);
    if (pending.length === 0) return;

    const db = await getDB();
    for (const entity of pending) {
      try {
        await processFunction(entity);
        await db.delete(storeName, entity.id);
      } catch (error) {
        console.error(`Erro ao sincronizar offline entity no ${storeName}:`, error);
      }
    }
  }
};

// Listen for online event
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    offlineStore.syncAllEntities();
  });

  // Listen for Service Worker messages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'TRIGGER_SYNC') {
        offlineStore.syncAllEntities();
      }
    });
  }
}
