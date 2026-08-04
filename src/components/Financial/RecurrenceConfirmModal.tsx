import React from "react";
import { Repeat, Check, Calendar } from "lucide-react";

interface RecurrenceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (applyToFuture: boolean) => void;
  title?: string;
  description?: string;
}

export default function RecurrenceConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Lançamento Recorrente",
  description = "Este lançamento faz parte de uma série de lançamentos recorrentes. Como deseja aplicar as alterações?"
}: RecurrenceConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6 border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl shrink-0">
            <Repeat size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onConfirm(false)}
            className="w-full p-4 rounded-2xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 flex items-center justify-between group transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 text-gray-600 rounded-xl group-hover:bg-purple-100 group-hover:text-purple-700 transition-colors">
                <Calendar size={18} />
              </div>
              <div>
                <span className="text-sm font-bold text-gray-800 block">Apenas este lançamento</span>
                <span className="text-xs text-gray-500">Altera somente o registro selecionado</span>
              </div>
            </div>
            <Check size={18} className="text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          <button
            onClick={() => onConfirm(true)}
            className="w-full p-4 rounded-2xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 flex items-center justify-between group transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-xl transition-colors">
                <Repeat size={18} />
              </div>
              <div>
                <span className="text-sm font-bold text-gray-800 block">Este e lançamentos futuros</span>
                <span className="text-xs text-gray-500">Aplica a alteração em cascata nas parcelas seguintes</span>
              </div>
            </div>
            <Check size={18} className="text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
