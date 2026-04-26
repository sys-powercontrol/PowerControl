import React from "react";
import { Percent, FileText } from "lucide-react";

interface TaxRuleFormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  initialData?: any;
  isPending: boolean;
}

export function TaxRuleForm({ onSubmit, onCancel, initialData, isPending }: TaxRuleFormProps) {
  return (
    <form onSubmit={onSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">NCM *</label>
          <input 
            name="ncm" 
            defaultValue={initialData?.ncm} 
            required 
            placeholder="Ex: 8471.30.12" 
            className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">Descrição</label>
          <input 
            name="description" 
            defaultValue={initialData?.description} 
            placeholder="Ex: Notebooks e computadores" 
            className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
          />
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Percent size={16} className="text-blue-600" />
          Alíquotas (%)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">ICMS</label>
            <input 
              name="icms_rate" 
              type="number" 
              step="0.01" 
              defaultValue={initialData?.icms_rate || 0} 
              className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">IPI</label>
            <input 
              name="ipi_rate" 
              type="number" 
              step="0.01" 
              defaultValue={initialData?.ipi_rate || 0} 
              className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">PIS</label>
            <input 
              name="pis_rate" 
              type="number" 
              step="0.01" 
              defaultValue={initialData?.pis_rate || 0} 
              className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">COFINS</label>
            <input 
              name="cofins_rate" 
              type="number" 
              step="0.01" 
              defaultValue={initialData?.cofins_rate || 0} 
              className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <FileText size={16} className="text-blue-600" />
          CFOP Padrão
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Operação Interna (Mesmo Estado)</label>
            <input 
              name="cfop_internal" 
              defaultValue={initialData?.cfop_internal} 
              placeholder="Ex: 5102" 
              className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Operação Interestadual</label>
            <input 
              name="cfop_interstate" 
              defaultValue={initialData?.cfop_interstate} 
              placeholder="Ex: 6102" 
              className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="px-6 py-2 text-gray-500 font-bold">Cancelar</button>
        <button type="submit" disabled={isPending} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100">
          {isPending ? "Salvando..." : (initialData ? "Salvar Alterações" : "Cadastrar Regra")}
        </button>
      </div>
    </form>
  );
}
