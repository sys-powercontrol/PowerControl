import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR, getNowBR, getTodayBR } from "../lib/dateUtils";
import { 
  History, 
  Search, 
  Filter, 
  Calendar, 
  Building2, 
  User as UserIcon, 
  Eye, 
  Download,
  Shield,
  Crown,
  Info,
  X
} from "lucide-react";
import { AuditLog, Company, User } from "../types";
import { 
  format, 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  parseISO,
  subDays
} from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AuditLogs() {
  const { user: currentUser, hasPermission } = useAuth();
  const canView = hasPermission('audit.view');

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [dateRange, setDateRange] = useState({
    start: formatBR(subDays(getNowBR(), 7), 'yyyy-MM-dd'),
    end: getTodayBR()
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não tem permissão para visualizar os logs de auditoria. 
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

  const isAdminMaster = currentUser?.role === 'master';

  if (!isAdminMaster) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Esta página é exclusiva para o Administrador Master do sistema.
          </p>
        </div>
      </div>
    );
  }

  const { data: logs = [], isLoading } = useQuery({ 
    queryKey: ["audit_logs", "all"], 
    queryFn: () => api.get("audit_logs", { _all: true, _orderBy: "timestamp", _orderDir: "desc" }) 
  });

  const { data: companies = [] } = useQuery({ 
    queryKey: ["companies", "all"], 
    queryFn: () => api.get("companies", { _all: true }) 
  });

  const { data: users = [] } = useQuery({ 
    queryKey: ["users", "all"], 
    queryFn: () => api.get("users", { _all: true }) 
  });

  const filteredLogs = useMemo(() => {
    return logs.filter((log: AuditLog) => {
      const matchesSearch = 
        (log.description?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (log.entity?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (log.user_name?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      
      const matchesCompany = !selectedCompanyId || log.company_id === selectedCompanyId;
      const matchesUser = !selectedUserId || log.user_id === selectedUserId;
      const matchesAction = !selectedAction || log.action === selectedAction;
      
      const logDate = log.timestamp?.seconds 
        ? new Date(log.timestamp.seconds * 1000) 
        : new Date();
        
      const matchesDate = isWithinInterval(logDate, {
        start: startOfDay(new Date(`${dateRange.start}T12:00:00`)),
        end: endOfDay(new Date(`${dateRange.end}T12:00:00`))
      });

      return matchesSearch && matchesCompany && matchesUser && matchesAction && matchesDate;
    });
  }, [logs, searchTerm, selectedCompanyId, selectedUserId, selectedAction, dateRange]);

  const formatMetadata = (metadata: any) => {
    if (!metadata) return null;
    try {
      return JSON.stringify(metadata, null, 2);
    } catch (e) {
      return String(metadata);
    }
  };

  const renderDiff = (changes: any) => {
    if (!changes || !changes.old || !changes.new) return null;

    const keys = Object.keys(changes.new);
    if (keys.length === 0) return null;

    return (
      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase">Alterações Realizadas</p>
        <div className="overflow-hidden border border-gray-100 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase font-black tracking-widest">
                <th className="px-4 py-2">Campo</th>
                <th className="px-4 py-2">De</th>
                <th className="px-4 py-2">Para</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {keys.map(key => (
                <tr key={key} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2 font-bold text-gray-700">{key}</td>
                  <td className="px-4 py-2 text-red-600 line-through decoration-red-300">
                    {typeof changes.old[key] === 'object' ? JSON.stringify(changes.old[key]) : String(changes.old[key] ?? '-')}
                  </td>
                  <td className="px-4 py-2 text-green-600 font-medium">
                    {typeof changes.new[key] === 'object' ? JSON.stringify(changes.new[key]) : String(changes.new[key] ?? '-')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
            <History size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Auditoria Global</h1>
            <p className="text-gray-500">Monitore todas as ações críticas do sistema.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
          <Download size={18} />
          Exportar Logs
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-50">
          <Filter size={20} className="text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Filtros de Auditoria</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Busca Livre</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Descrição, entidade..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Empresa</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
              >
                <option value="">Todas as Empresas</option>
                {companies.map((c: Company) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Usuário</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Todos os Usuários</option>
                {users.map((u: User) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Ação</label>
            <select 
              className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
            >
              <option value="">Todas as Ações</option>
              <option value="CREATE">Criação</option>
              <option value="UPDATE">Edição</option>
              <option value="DELETE">Exclusão</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-50">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
              <Calendar size={14} /> Data Inicial
            </label>
            <input 
              type="date" 
              className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
              <Calendar size={14} /> Data Final
            </label>
            <input 
              type="date" 
              className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider bg-gray-50/50">
                <th className="px-6 py-4 font-bold">Data/Hora</th>
                <th className="px-6 py-4 font-bold">Usuário</th>
                <th className="px-6 py-4 font-bold">Empresa</th>
                <th className="px-6 py-4 font-bold">Ação</th>
                <th className="px-6 py-4 font-bold">Entidade</th>
                <th className="px-6 py-4 font-bold">Descrição</th>
                <th className="px-6 py-4 font-bold text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Carregando logs...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Nenhum log encontrado para os filtros selecionados.</td>
                </tr>
              ) : filteredLogs.map((log: AuditLog) => (
                <tr key={log.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                    {log.timestamp?.seconds 
                      ? formatBR(log.timestamp.seconds * 1000, 'dd/MM/yy HH:mm') 
                      : 'Agora'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {log.user_name?.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{log.user_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500">
                      {companies.find((c: any) => c.id === log.company_id)?.name || "Global"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      log.action === "CREATE" ? "bg-green-100 text-green-700" : 
                      log.action === "UPDATE" ? "bg-blue-100 text-blue-700" : 
                      log.action === "DELETE" ? "bg-red-100 text-red-700" : 
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                    {log.entity}
                  </td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                    {log.description}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <Info size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Detalhes do Log</h2>
                  <p className="text-xs text-gray-500">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Data/Hora</p>
                  <p className="font-medium text-gray-900">
                    {selectedLog.timestamp?.seconds 
                      ? formatBR(selectedLog.timestamp.seconds * 1000, 'dd/MM/yyyy HH:mm:ss') 
                      : 'Agora'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Usuário</p>
                  <p className="font-medium text-gray-900">{selectedLog.user_name} ({selectedLog.user_id})</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Entidade</p>
                  <p className="font-medium text-gray-900">{selectedLog.entity} ({selectedLog.entity_id})</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Ação</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedLog.action === "CREATE" ? "bg-green-100 text-green-700" : 
                    selectedLog.action === "UPDATE" ? "bg-blue-100 text-blue-700" : 
                    selectedLog.action === "DELETE" ? "bg-red-100 text-red-700" : 
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {selectedLog.action}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase">Descrição</p>
                <p className="p-4 bg-gray-50 rounded-2xl text-gray-700 border border-gray-100">
                  {selectedLog.description}
                </p>
              </div>

              {renderDiff(selectedLog.changes)}

              {selectedLog.metadata && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Metadados (JSON)</p>
                  <pre className="p-4 bg-gray-900 text-blue-300 rounded-2xl text-xs overflow-x-auto font-mono">
                    {formatMetadata(selectedLog.metadata)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-8 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
