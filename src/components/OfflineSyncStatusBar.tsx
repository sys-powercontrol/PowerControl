import { useState, useEffect, useCallback } from "react";
import { WifiOff, RefreshCw, AlertTriangle, Cloud } from "lucide-react";
import { offlineStore, OfflineQueueStats } from "../lib/offlineStore";
import { motion, AnimatePresence } from "motion/react";

export default function OfflineSyncStatusBar() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [queueStats, setQueueStats] = useState<OfflineQueueStats>({
    sales: 0,
    salesFailed: 0,
    purchases: 0,
    accountsPayable: 0,
    accountsReceivable: 0,
    inventoryMovements: 0,
    clients: 0,
    total: 0
  });

  const refreshStats = useCallback(async () => {
    try {
      const stats = await offlineStore.getQueueStats();
      setQueueStats(stats);
    } catch (e) {
      console.warn("Could not load queue stats:", e);
    }
  }, []);

  useEffect(() => {
    // Initial fetch in microtask
    const timer = setTimeout(() => {
      refreshStats();
    }, 0);

    const handleOnline = () => {
      setIsOnline(true);
      offlineStore.syncAll();
      refreshStats();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshStats();
    };

    const handleQueueUpdate = (e: any) => {
      if (e.detail) {
        setQueueStats(e.detail);
      } else {
        refreshStats();
      }
    };

    const handleSyncStatus = (e: any) => {
      if (e.detail?.isSyncing !== undefined) {
        setIsSyncing(e.detail.isSyncing);
      }
      refreshStats();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline_queue_updated", handleQueueUpdate);
    window.addEventListener("offline_sync_status", handleSyncStatus);
    window.addEventListener("sales_synced", refreshStats);

    const interval = setInterval(refreshStats, 8000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline_queue_updated", handleQueueUpdate);
      window.removeEventListener("offline_sync_status", handleSyncStatus);
      window.removeEventListener("sales_synced", refreshStats);
      clearInterval(interval);
    };
  }, [refreshStats]);

  const handleManualSync = () => {
    if (!isSyncing && isOnline) {
      offlineStore.syncAll();
    }
  };

  // Only render if offline, or if currently syncing, or if there are pending/failed items in queue
  const shouldShow = !isOnline || isSyncing || queueStats.total > 0 || queueStats.salesFailed > 0;

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="w-full overflow-hidden transition-all duration-300 select-none z-40 relative"
      >
        {!isOnline ? (
          <div className="bg-amber-600 text-white px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-amber-700/80 flex items-center justify-center shrink-0">
                <WifiOff size={14} className="text-amber-100" />
              </div>
              <div>
                <span className="font-bold">Modo Offline Ativo</span> — Suas movimentações (vendas, compras, baixas e cadastros) estão sendo salvas localmente com segurança.
              </div>
            </div>
            <div className="flex items-center gap-2">
              {queueStats.total > 0 && (
                <span className="bg-amber-800/80 text-amber-100 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-500/40">
                  {queueStats.total} {queueStats.total === 1 ? 'movimentação pendente' : 'movimentações pendentes'}
                </span>
              )}
            </div>
          </div>
        ) : isSyncing ? (
          <div className="bg-blue-600 text-white px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-blue-700/80 flex items-center justify-center shrink-0">
                <RefreshCw size={14} className="animate-spin text-blue-100" />
              </div>
              <div>
                <span className="font-bold">Sincronizando com a Nuvem</span> — Gravando movimentações pendentes na base de dados...
              </div>
            </div>
            {queueStats.total > 0 && (
              <span className="bg-blue-800/80 text-blue-100 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-500/40">
                {queueStats.total} restantes
              </span>
            )}
          </div>
        ) : queueStats.total > 0 ? (
          <div className="bg-emerald-700 text-white px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-800/80 flex items-center justify-center shrink-0">
                <Cloud size={14} className="text-emerald-100" />
              </div>
              <div>
                <span className="font-bold">Conexão Restabelecida</span> — Há {queueStats.total} {queueStats.total === 1 ? 'movimentação gravada' : 'movimentações gravadas'} offline aguardando sincronização.
              </div>
            </div>
            <button
              onClick={handleManualSync}
              className="px-3 py-1 bg-white text-emerald-800 hover:bg-emerald-50 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              Sincronizar Agora
            </button>
          </div>
        ) : queueStats.salesFailed > 0 ? (
          <div className="bg-rose-700 text-white px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-rose-800/80 flex items-center justify-center shrink-0">
                <AlertTriangle size={14} className="text-rose-100" />
              </div>
              <div>
                <span className="font-bold">Atenção</span> — {queueStats.salesFailed} {queueStats.salesFailed === 1 ? 'venda offline apresentou' : 'vendas offline apresentaram'} divergência de estoque ou validação durante o envio.
              </div>
            </div>
            <button
              onClick={handleManualSync}
              className="px-3 py-1 bg-white text-rose-800 hover:bg-rose-50 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              Tentar Novamente
            </button>
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
