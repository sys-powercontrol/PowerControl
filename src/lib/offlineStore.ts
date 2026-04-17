import { inventory } from "./inventory";
import { toast } from "sonner";
import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "powercontrol_offline_db";
const STORE_NAME = "sales";

import { api } from "./api";

export interface OfflineSale {
  id: string;
  saleData: any;
  items: any[];
  userContext?: any;
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export const offlineStore = {
  async getPendingSales(): Promise<OfflineSale[]> {
    const db = await getDB();
    return db.getAll(STORE_NAME);
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
    await db.add(STORE_NAME, newSale);
    
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
        const processedSaleData = await inventory.processSale(sale.saleData, sale.items, sale.userContext);
        
        await api.log({
          action: 'CREATE',
          entity: 'sales',
          entity_id: processedSaleData.id,
          description: `Venda Offline Sincronizada #${processedSaleData.id.substr(0, 8).toUpperCase()}`,
          metadata: { isOfflineSync: true, timestamp: sale.timestamp }
        }, sale.userContext);

        await db.delete(STORE_NAME, sale.id);
        successCount++;
      } catch (error) {
        console.error("Erro ao sincronizar venda offline:", error);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} vendas sincronizadas com sucesso!`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} vendas falharam na sincronização.`);
    }
  },

  async hasPendingSales(): Promise<boolean> {
    const sales = await this.getPendingSales();
    return sales.length > 0;
  }
};

// Listen for online event
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    offlineStore.syncSales();
  });

  // Listen for Service Worker messages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'TRIGGER_SYNC') {
        offlineStore.syncSales();
      }
    });
  }
}
