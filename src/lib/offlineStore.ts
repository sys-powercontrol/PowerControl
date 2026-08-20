import { inventory } from "./inventory";
import { toast } from "sonner";
import { openDB, IDBPDatabase } from "idb";
import { api } from "./api";
import { queryClient } from "./queryClient";

const DB_NAME = "powercontrol_offline_db";
const DB_VERSION = 4;

export const STORES = {
  SALES: "sales",
  SALES_FAILED: "sales_failed_sync",
  PURCHASES: "purchases",
  ACCOUNTS_PAYABLE: "accounts_payable",
  ACCOUNTS_RECEIVABLE: "accounts_receivable",
  INVENTORY_MOVEMENTS: "inventory_movements",
  CLIENTS: "clients"
} as const;

export interface OfflineSale {
  id: string;
  saleData: any;
  items: any[];
  userContext?: any;
  timestamp: number;
  retryCount?: number;
}

export interface OfflineEntity {
  id: string;
  data: any;
  items?: any[];
  userContext?: any;
  timestamp: number;
  retryCount?: number;
}

export interface OfflineQueueStats {
  sales: number;
  salesFailed: number;
  purchases: number;
  accountsPayable: number;
  accountsReceivable: number;
  inventoryMovements: number;
  clients: number;
  total: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;
let isSyncingProcess = false;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.SALES)) {
          db.createObjectStore(STORES.SALES, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.SALES_FAILED)) {
          db.createObjectStore(STORES.SALES_FAILED, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.PURCHASES)) {
          db.createObjectStore(STORES.PURCHASES, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.ACCOUNTS_PAYABLE)) {
          db.createObjectStore(STORES.ACCOUNTS_PAYABLE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.ACCOUNTS_RECEIVABLE)) {
          db.createObjectStore(STORES.ACCOUNTS_RECEIVABLE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.INVENTORY_MOVEMENTS)) {
          db.createObjectStore(STORES.INVENTORY_MOVEMENTS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.CLIENTS)) {
          db.createObjectStore(STORES.CLIENTS, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

const notifyQueueChange = async () => {
  if (typeof window !== "undefined") {
    const stats = await offlineStore.getQueueStats();
    window.dispatchEvent(new CustomEvent("offline_queue_updated", { detail: stats }));
  }
};

const registerBackgroundSync = async (tag: string) => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(tag);
    } catch (err) {
      console.warn(`Background sync registration notice (${tag}):`, err);
    }
  }
};

export const offlineStore = {
  // --- STATS & COUNTS ---
  async getQueueStats(): Promise<OfflineQueueStats> {
    try {
      const db = await getDB();
      const [sales, salesFailed, purchases, ap, ar, im, clients] = await Promise.all([
        db.count(STORES.SALES),
        db.count(STORES.SALES_FAILED),
        db.count(STORES.PURCHASES),
        db.count(STORES.ACCOUNTS_PAYABLE),
        db.count(STORES.ACCOUNTS_RECEIVABLE),
        db.count(STORES.INVENTORY_MOVEMENTS),
        db.count(STORES.CLIENTS)
      ]);

      const total = sales + purchases + ap + ar + im + clients;
      return {
        sales,
        salesFailed,
        purchases,
        accountsPayable: ap,
        accountsReceivable: ar,
        inventoryMovements: im,
        clients,
        total
      };
    } catch (e) {
      console.warn("Error getting offline queue stats:", e);
      return {
        sales: 0,
        salesFailed: 0,
        purchases: 0,
        accountsPayable: 0,
        accountsReceivable: 0,
        inventoryMovements: 0,
        clients: 0,
        total: 0
      };
    }
  },

  async hasPendingItems(): Promise<boolean> {
    const stats = await this.getQueueStats();
    return stats.total > 0;
  },

  isSyncing(): boolean {
    return isSyncingProcess;
  },

  // --- SALES ---
  async getPendingSales(): Promise<OfflineSale[]> {
    const db = await getDB();
    return db.getAll(STORES.SALES);
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
      retryCount: 0
    };
    await db.add(STORES.SALES, newSale);
    await registerBackgroundSync('sync-sales');
    await notifyQueueChange();

    toast.success("Venda gravada offline! Será sincronizada automaticamente assim que a conexão for restabelecida.", {
      duration: 4000
    });
    return newSale;
  },

  async getFailedSales(): Promise<any[]> {
    const db = await getDB();
    return db.getAll(STORES.SALES_FAILED);
  },

  async deleteFailedSale(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(STORES.SALES_FAILED, id);
    await notifyQueueChange();
  },

  async hasPendingSales(): Promise<boolean> {
    const sales = await this.getPendingSales();
    return sales.length > 0;
  },

  // --- CLIENTS ---
  async saveClient(clientData: any, userContext?: any) {
    const db = await getDB();
    const user = userContext || api.getCurrentUser();
    const newEntity: OfflineEntity = {
      id: clientData.id || crypto.randomUUID(),
      data: { ...clientData, id: clientData.id || crypto.randomUUID() },
      userContext: user,
      timestamp: Date.now(),
      retryCount: 0
    };
    await db.add(STORES.CLIENTS, newEntity);
    await registerBackgroundSync('sync-clients');
    await notifyQueueChange();

    toast.success("Cliente cadastrado offline! Sincronização pendente.");
    return newEntity;
  },

  // --- PURCHASES ---
  async savePurchase(purchaseData: any, items: any[], userContext?: any) {
    const db = await getDB();
    const user = userContext || api.getCurrentUser();
    const newEntity: OfflineEntity = {
      id: purchaseData.id || crypto.randomUUID(),
      data: purchaseData,
      items,
      userContext: user,
      timestamp: Date.now(),
      retryCount: 0
    };
    await db.add(STORES.PURCHASES, newEntity);
    await registerBackgroundSync('sync-purchases');
    await notifyQueueChange();

    toast.success("Compra gravada offline! Será sincronizada automaticamente.");
    return newEntity;
  },

  // --- ACCOUNTS PAYABLE ---
  async saveAccountPayable(accountData: any, userContext?: any) {
    const db = await getDB();
    const user = userContext || api.getCurrentUser();
    const newEntity: OfflineEntity = {
      id: accountData.id || crypto.randomUUID(),
      data: accountData,
      userContext: user,
      timestamp: Date.now(),
      retryCount: 0
    };
    await db.add(STORES.ACCOUNTS_PAYABLE, newEntity);
    await registerBackgroundSync('sync-accounts-payable');
    await notifyQueueChange();

    toast.success("Conta a pagar salva offline! Sincronização pendente.");
    return newEntity;
  },

  // --- ACCOUNTS RECEIVABLE ---
  async saveAccountReceivable(accountData: any, userContext?: any) {
    const db = await getDB();
    const user = userContext || api.getCurrentUser();
    const newEntity: OfflineEntity = {
      id: accountData.id || crypto.randomUUID(),
      data: accountData,
      userContext: user,
      timestamp: Date.now(),
      retryCount: 0
    };
    await db.add(STORES.ACCOUNTS_RECEIVABLE, newEntity);
    await registerBackgroundSync('sync-accounts-receivable');
    await notifyQueueChange();

    toast.success("Conta a receber salva offline! Sincronização pendente.");
    return newEntity;
  },

  // --- INVENTORY MOVEMENTS / ADJUSTMENTS ---
  async saveInventoryMovement(movementData: any, userContext?: any) {
    const db = await getDB();
    const user = userContext || api.getCurrentUser();
    const newEntity: OfflineEntity = {
      id: crypto.randomUUID(),
      data: movementData,
      userContext: user,
      timestamp: Date.now(),
      retryCount: 0
    };
    await db.add(STORES.INVENTORY_MOVEMENTS, newEntity);
    await registerBackgroundSync('sync-inventory');
    await notifyQueueChange();

    toast.success("Movimentação de estoque gravada offline! Sincronização pendente.");
    return newEntity;
  },

  // --- GENERIC ENTITY GETTERS ---
  async getPendingEntities(storeName: string): Promise<OfflineEntity[]> {
    const db = await getDB();
    return db.getAll(storeName);
  },

  // --- SYNC INDIVIDUAL STORES ---
  async syncSales(): Promise<{ success: number; failed: number }> {
    const pending = await this.getPendingSales();
    if (pending.length === 0) return { success: 0, failed: 0 };

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

        await db.delete(STORES.SALES, sale.id);
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

            await db.delete(STORES.SALES, sale.id);
            failCount++;
            continue;
          } catch (pendingErr) {
            console.error("Erro ao registrar venda pendente de estoque:", pendingErr);
          }
        }

        await db.put(STORES.SALES_FAILED, { ...sale, error_reason: errMsg });
        await db.delete(STORES.SALES, sale.id);
        failCount++;

        if (companyId) {
          try {
            await api.post("notifications", {
              company_id: companyId,
              title: "Divergência / Erro em Sync Offline",
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

    await notifyQueueChange();
    return { success: successCount, failed: failCount };
  },

  // --- MASTER SYNC ALL PENDING MOVEMENTS ---
  async syncAll(): Promise<{ totalSuccess: number; totalFailed: number }> {
    if (isSyncingProcess) {
      console.log("Sincronização já em andamento...");
      return { totalSuccess: 0, totalFailed: 0 };
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.log("Sem conexão ativa para sincronizar no momento.");
      return { totalSuccess: 0, totalFailed: 0 };
    }

    const initialStats = await this.getQueueStats();
    if (initialStats.total === 0) {
      return { totalSuccess: 0, totalFailed: 0 };
    }

    isSyncingProcess = true;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("offline_sync_status", { 
        detail: { isSyncing: true, pendingCount: initialStats.total } 
      }));
    }

    toast.info(`Sincronizando ${initialStats.total} movimentações offline com o servidor...`, {
      id: "sync-progress-toast"
    });

    let totalSuccess = 0;
    let totalFailed = 0;
    const db = await getDB();

    try {
      // 1. Sync Clients FIRST so dependent sales or AP can reference them
      const pendingClients = await db.getAll(STORES.CLIENTS);
      for (const entity of pendingClients) {
        try {
          await api.post("clients", entity.data);
          await db.delete(STORES.CLIENTS, entity.id);
          totalSuccess++;
        } catch (err) {
          console.error("Erro sincronizando cliente offline:", err);
          totalFailed++;
        }
      }

      // 2. Sync Purchases (to update stocks and weighted costs before sales)
      const pendingPurchases = await db.getAll(STORES.PURCHASES);
      for (const entity of pendingPurchases) {
        try {
          await inventory.processPurchase(entity.data, entity.items || [], entity.userContext);
          await db.delete(STORES.PURCHASES, entity.id);
          totalSuccess++;
        } catch (err) {
          console.error("Erro sincronizando compra offline:", err);
          totalFailed++;
        }
      }

      // 3. Sync Sales
      const salesResult = await this.syncSales();
      totalSuccess += salesResult.success;
      totalFailed += salesResult.failed;

      // 4. Sync Accounts Payable
      const pendingAP = await db.getAll(STORES.ACCOUNTS_PAYABLE);
      for (const entity of pendingAP) {
        try {
          await api.post("accountsPayable", entity.data);
          await db.delete(STORES.ACCOUNTS_PAYABLE, entity.id);
          totalSuccess++;
        } catch (err) {
          console.error("Erro sincronizando conta a pagar offline:", err);
          totalFailed++;
        }
      }

      // 5. Sync Accounts Receivable
      const pendingAR = await db.getAll(STORES.ACCOUNTS_RECEIVABLE);
      for (const entity of pendingAR) {
        try {
          await api.post("accountsReceivable", entity.data);
          await db.delete(STORES.ACCOUNTS_RECEIVABLE, entity.id);
          totalSuccess++;
        } catch (err) {
          console.error("Erro sincronizando conta a receber offline:", err);
          totalFailed++;
        }
      }

      // 6. Sync Inventory Movements / Adjustments
      const pendingIM = await db.getAll(STORES.INVENTORY_MOVEMENTS);
      for (const entity of pendingIM) {
        try {
          await inventory.recordMovement(entity.data, entity.userContext);
          await db.delete(STORES.INVENTORY_MOVEMENTS, entity.id);
          totalSuccess++;
        } catch (err) {
          console.error("Erro sincronizando ajuste de estoque offline:", err);
          totalFailed++;
        }
      }

      // Invalidate relevant React Queries so UI displays refreshed cloud data
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      queryClient.invalidateQueries({ queryKey: ["accountsPayable"] });
      queryClient.invalidateQueries({ queryKey: ["accountsReceivable"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      queryClient.invalidateQueries({ queryKey: ["daily_summaries"] });

      if (totalSuccess > 0) {
        toast.success(`${totalSuccess} ${totalSuccess === 1 ? 'movimentação offline sincronizada' : 'movimentações offline sincronizadas'} com sucesso!`, {
          id: "sync-progress-toast"
        });
      }
      if (totalFailed > 0) {
        toast.warning(`${totalFailed} ${totalFailed === 1 ? 'movimentação falhou' : 'movimentações falharam'} na sincronização e continuam na fila.`);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sales_synced"));
      }
    } catch (globalErr) {
      console.error("Erro crítico no processo de sincronização offline:", globalErr);
      toast.error("Houve uma instabilidade durante a sincronização offline.");
    } finally {
      isSyncingProcess = false;
      await notifyQueueChange();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("offline_sync_status", { 
          detail: { isSyncing: false, pendingCount: (await this.getQueueStats()).total } 
        }));
      }
    }

    return { totalSuccess, totalFailed };
  },

  // Alias for backward compatibility
  async syncAllEntities() {
    return this.syncAll();
  }
};

// Global Listeners for Automatic Reconnection & Syncing
if (typeof window !== "undefined") {
  // Listen for browser reconnection
  window.addEventListener("online", () => {
    console.log("Conexão detectada! Disparando sincronização de movimentações offline...");
    toast.info("Internet restabelecida! Iniciando sincronização automática...");
    offlineStore.syncAll();
  });

  // Listen for Service Worker messages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && (event.data.type === 'TRIGGER_SYNC' || event.data.type === 'CHECK_SYNC')) {
        offlineStore.syncAll();
      }
    });
  }

  // Periodic heartbeat fallback to check and sync pending offline items when online
  setInterval(() => {
    if (navigator.onLine && !offlineStore.isSyncing()) {
      offlineStore.getQueueStats().then(stats => {
        if (stats.total > 0) {
          offlineStore.syncAll();
        }
      }).catch(() => {});
    }
  }, 20000);
}
