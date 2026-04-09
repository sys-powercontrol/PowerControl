import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export type NfeStatus = 'Autorizada' | 'Rejeitada' | 'Cancelada' | 'Pendente' | 'Emitida';

interface NfeStatusBadgeProps {
  status: NfeStatus;
}

export default function NfeStatusBadge({ status }: NfeStatusBadgeProps) {
  const config = {
    Autorizada: {
      color: 'bg-green-50 text-green-600 border-green-100',
      icon: CheckCircle2,
      label: 'Autorizada'
    },
    Emitida: {
      color: 'bg-green-50 text-green-600 border-green-100',
      icon: CheckCircle2,
      label: 'Emitida'
    },
    Rejeitada: {
      color: 'bg-red-50 text-red-600 border-red-100',
      icon: AlertCircle,
      label: 'Rejeitada'
    },
    Cancelada: {
      color: 'bg-gray-50 text-gray-500 border-gray-100',
      icon: XCircle,
      label: 'Cancelada'
    },
    Pendente: {
      color: 'bg-orange-50 text-orange-600 border-orange-100',
      icon: Clock,
      label: 'Pendente'
    }
  };

  const { color, icon: Icon, label } = config[status] || config.Pendente;

  return (
    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border flex items-center gap-1 w-fit ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}
