import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR } from "../lib/dateUtils";
import { 
  Mail, 
  Plus, 
  Search, 
  UserPlus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Trash2, 
  Shield, 
  Loader2, 
  Calendar
} from "lucide-react";
import { toast } from "sonner";

export default function InvitesManager() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDING" | "ACCEPTED" | "EXPIRED">("all");
  
  const currentCompanyId = api.getCompanyId() || user?.company_id;

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ["invites", currentCompanyId],
    queryFn: async () => {
      const res = await api.get("invites", { company_id: currentCompanyId });
      return Array.isArray(res) ? res : [];
    },
    enabled: !!currentCompanyId
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      const inviteData = {
        email: data.email.trim().toLowerCase(),
        role: data.role,
        company_id: currentCompanyId,
        status: "PENDING",
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      };

      const result: any = await api.post("invites", inviteData);
      
      await api.log({
        action: 'CREATE',
        entity: 'invites',
        entity_id: result?.id || '',
        description: `Enviou convite para ${data.email}`,
        metadata: inviteData
      });

      return result;
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Convite enviado com sucesso!");
      setIsModalOpen(false);
      if (res?.id) {
        const link = `${window.location.origin}/register?invite=${res.id}`;
        navigator.clipboard.writeText(link);
        toast.info("Link de convite copiado automaticamente para a área de transferência!");
      }
    },
    onError: (err: any) => {
      toast.error("Erro ao enviar convite: " + (err.message || "Tente novamente."));
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put("invites", id, { status: "EXPIRED" });
      await api.log({
        action: 'UPDATE',
        entity: 'invites',
        entity_id: id,
        description: `Cancelou convite`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Convite cancelado.");
    },
    onError: (err: any) => {
      toast.error("Erro ao cancelar convite: " + (err.message || "Tente novamente."));
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const role = String(formData.get("role") || "user");

    if (!email) {
      toast.error("Por favor, informe o e-mail do convidado.");
      return;
    }

    inviteMutation.mutate({ email, role });
  };

  const copyInviteLink = (id: string) => {
    const link = `${window.location.origin}/register?invite=${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de convite copiado para a área de transferência!");
  };

  const filteredInvites = invites.filter((i: any) => {
    const matchesSearch = i.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = invites.filter((i: any) => i.status === "PENDING").length;
  const acceptedCount = invites.filter((i: any) => i.status === "ACCEPTED").length;
  const expiredCount = invites.filter((i: any) => i.status === "EXPIRED").length;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100">
            <UserPlus size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Convites da Empresa</h2>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider">
                {invites.length} {invites.length === 1 ? "Convite" : "Convites"}
              </span>
            </div>
            <p className="text-xs text-gray-500">Envie e gerencie convites para novos funcionários ou administradores da sua equipe.</p>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Novo Convite</span>
        </button>
      </div>

      {/* Quick summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-orange-50/60 border border-orange-100 rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-orange-800">Pendentes</p>
            <p className="text-2xl font-black text-orange-950">{pendingCount}</p>
          </div>
          <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl">
            <Clock size={20} />
          </div>
        </div>

        <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-emerald-800">Aceitos</p>
            <p className="text-2xl font-black text-emerald-950">{acceptedCount}</p>
          </div>
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="p-4 bg-gray-50 border border-gray-200/80 rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-gray-700">Expirados / Cancelados</p>
            <p className="text-2xl font-black text-gray-900">{expiredCount}</p>
          </div>
          <div className="p-2.5 bg-gray-200 text-gray-600 rounded-xl">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por e-mail..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl w-full sm:w-auto text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "all" ? "bg-white text-gray-900 shadow-sm font-bold" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Todos ({invites.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "PENDING" ? "bg-white text-orange-600 shadow-sm font-bold" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Pendentes ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ACCEPTED")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "ACCEPTED" ? "bg-white text-emerald-600 shadow-sm font-bold" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Aceitos ({acceptedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("EXPIRED")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "EXPIRED" ? "bg-white text-gray-700 shadow-sm font-bold" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Expirados ({expiredCount})
          </button>
        </div>
      </div>

      {/* Table of Invites */}
      <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin text-blue-600" />
            Carregando convites da empresa...
          </div>
        ) : filteredInvites.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto">
              <UserPlus size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-800">Nenhum convite encontrado</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {searchTerm || statusFilter !== "all" 
                  ? "Nenhum resultado corresponde aos filtros aplicados." 
                  : "Envie seu primeiro convite clicando no botão 'Novo Convite' acima."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[11px] text-gray-400 uppercase tracking-wider bg-gray-50/70 border-b border-gray-100">
                  <th className="px-5 py-3.5 font-bold">E-mail Convidado</th>
                  <th className="px-5 py-3.5 font-bold">Cargo / Perfil</th>
                  <th className="px-5 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 font-bold">Data de Expiração</th>
                  <th className="px-5 py-3.5 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredInvites.map((invite: any) => (
                  <tr key={invite.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                          <Mail size={16} />
                        </div>
                        <span className="font-bold text-gray-900 truncate max-w-xs">{invite.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                        invite.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        <Shield size={12} />
                        {invite.role === "admin" ? "Administrador" : "Usuário"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {invite.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                            <Clock size={12} />
                            Pendente
                          </span>
                        )}
                        {invite.status === "ACCEPTED" && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                            <CheckCircle2 size={12} />
                            Aceito
                          </span>
                        )}
                        {invite.status === "EXPIRED" && (
                          <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                            <XCircle size={12} />
                            Expirado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 font-medium">
                      {formatBR(invite.expires_at, "dd/MM/yyyy")}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        {invite.status === "PENDING" && (
                          <>
                            <button 
                              type="button"
                              onClick={() => copyInviteLink(invite.id)}
                              className="px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                              title="Copiar Link de Registro"
                            >
                              <Copy size={13} />
                              <span className="hidden sm:inline">Copiar Link</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => cancelMutation.mutate(invite.id)}
                              disabled={cancelMutation.isPending}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Cancelar este convite"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-2.5">
                <UserPlus size={22} />
                <h3 className="text-lg font-bold">Novo Convite</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
              >
                <XCircle size={22} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 ml-1">E-mail do Convidado *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    name="email"
                    type="email" 
                    required
                    placeholder="colaborador@empresa.com.br"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 ml-1">Nível de Acesso (Cargo)</label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select 
                    name="role"
                    required
                    defaultValue="user"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all appearance-none cursor-pointer"
                  >
                    <option value="user">Usuário Comum (Funcionário)</option>
                    <option value="admin">Administrador da Empresa</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-100 flex gap-2.5 items-start">
                <Calendar className="text-blue-600 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-blue-800 leading-relaxed">
                  O link de convite é válido por <strong>7 dias</strong>. Ao confirmar, o link será gerado e copiado automaticamente para envio.
                </p>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={inviteMutation.isPending}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {inviteMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                  <span>{inviteMutation.isPending ? "Gerando..." : "Gerar e Enviar"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
