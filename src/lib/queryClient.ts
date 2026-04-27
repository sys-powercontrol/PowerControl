import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import * as idb from "idb-keyval";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
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
});
