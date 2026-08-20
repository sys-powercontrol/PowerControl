import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import * as idb from "idb-keyval";

export const CACHE_TIERS = {
  // Static / Metadata (Companies, Categories, Bank Accounts, Tax Settings, Permissions)
  STATIC: {
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  },
  // Master / Catalog (Products, Clients, Suppliers, Sellers, Employees)
  MASTER: {
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60 * 12, // 12 hours
  },
  // Transactional / Paginated (Sales, Accounts Payable/Receivable, Purchases, Cashiers)
  TRANSACTIONAL: {
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  },
  // High-Level Analytics / Reports (DRE, Cashflow, Dashboards)
  REPORTS: {
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 6, // 6 hours
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes default
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount) => {
        if (!navigator.onLine) return false;
        return failureCount < 2;
      }
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => await idb.get(key),
    setItem: async (key, value) => await idb.set(key, value),
    removeItem: async (key) => await idb.del(key),
  },
});

persistQueryClient({
  queryClient,
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
});

