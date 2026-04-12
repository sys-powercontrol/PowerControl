import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = 'danger',
  isLoading = false
}: ConfirmationModalProps) {
  const variantStyles = {
    danger: {
      icon: <AlertTriangle className="text-red-600" size={24} />,
      bg: "bg-red-50",
      button: "bg-red-600 hover:bg-red-700 shadow-red-100",
    },
    warning: {
      icon: <AlertTriangle className="text-yellow-600" size={24} />,
      bg: "bg-yellow-50",
      button: "bg-yellow-600 hover:bg-yellow-700 shadow-yellow-100",
    },
    info: {
      icon: <AlertTriangle className="text-blue-600" size={24} />,
      bg: "bg-blue-50",
      button: "bg-blue-600 hover:bg-blue-700 shadow-blue-100",
    }
  };

  const currentVariant = variantStyles[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 flex items-start gap-4">
              <div className={`p-3 ${currentVariant.bg} rounded-2xl shrink-0`}>
                {currentVariant.icon}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-gray-500 mt-2 leading-relaxed whitespace-pre-wrap">
                  {message}
                </p>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`px-8 py-2.5 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 ${currentVariant.button}`}
              >
                {isLoading ? "Processando..." : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
