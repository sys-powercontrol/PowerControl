import React, { useState, useEffect } from "react";
import { RefreshCw, Database } from "lucide-react";

interface DataFreshnessBadgeProps {
  lastUpdated?: Date | number;
  onRefresh?: () => void;
  isFetching?: boolean;
  className?: string;
}

export const DataFreshnessBadge: React.FC<DataFreshnessBadgeProps> = ({
  lastUpdated,
  onRefresh,
  isFetching = false,
  className = ""
}) => {
  const [timeAgo, setTimeAgo] = useState("agora mesmo");

  useEffect(() => {
    const update = () => {
      const ts = lastUpdated 
        ? (typeof lastUpdated === "number" ? lastUpdated : lastUpdated.getTime())
        : Date.now();
      const diffSec = Math.floor((Date.now() - ts) / 1000);

      if (diffSec < 30) {
        setTimeAgo("agora mesmo");
      } else if (diffSec < 60) {
        setTimeAgo("há menos de 1 min");
      } else if (diffSec < 3600) {
        const mins = Math.floor(diffSec / 60);
        setTimeAgo(`há ${mins} min${mins > 1 ? "s" : ""}`);
      } else {
        const hours = Math.floor(diffSec / 3600);
        setTimeAgo(`há ${hours}h`);
      }
    };

    update();
    const timer = setInterval(update, 15000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  return (
    <div 
      id="data-freshness-badge"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/60 rounded-full transition-all shadow-xs ${className}`}
    >
      <Database className="w-3 h-3 text-emerald-600" />
      <span>Cache Otimizado ({timeAgo})</span>
      {onRefresh && (
        <button
          id="btn-refresh-cache"
          onClick={onRefresh}
          disabled={isFetching}
          title="Recarregar dados do servidor"
          className="p-0.5 ml-1 text-emerald-700 hover:text-emerald-900 rounded hover:bg-emerald-100 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin text-emerald-600" : ""}`} />
        </button>
      )}
    </div>
  );
};
