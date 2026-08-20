import React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface CursorPaginationProps {
  page: number;
  hasMore: boolean;
  isLoading?: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  pageSize?: number;
  totalLoaded?: number;
}

export const CursorPagination: React.FC<CursorPaginationProps> = ({
  page,
  hasMore,
  isLoading = false,
  onPrevPage,
  onNextPage,
  pageSize = 25,
  totalLoaded
}) => {
  return (
    <div id="cursor-pagination" className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 sm:px-6 rounded-b-2xl">
      <div className="flex justify-between flex-1 sm:hidden">
        <button
          id="btn-prev-mobile"
          onClick={onPrevPage}
          disabled={page <= 1 || isLoading}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Anterior
        </button>
        <button
          id="btn-next-mobile"
          onClick={onNextPage}
          disabled={!hasMore || isLoading}
          className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Próxima
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Página <span className="font-semibold text-gray-900">{page}</span>
            {totalLoaded !== undefined && (
              <> · <span className="font-semibold text-gray-900">{totalLoaded}</span> itens nesta página (limite: {pageSize})</>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {isLoading && (
            <span className="flex items-center text-xs text-gray-400 mr-2">
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-emerald-600" />
              Carregando dados...
            </span>
          )}
          <button
            id="btn-prev-page"
            onClick={onPrevPage}
            disabled={page <= 1 || isLoading}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </button>
          <button
            id="btn-next-page"
            onClick={onNextPage}
            disabled={!hasMore || isLoading}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Próxima
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
