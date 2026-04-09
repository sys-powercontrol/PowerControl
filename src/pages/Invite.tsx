import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Invite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (user?.role !== 'admin' && user?.role !== 'master') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Esta página é exclusiva para Administradores da empresa.
          </p>
        </div>
      </div>
    );
  }

  const { data: invites = [] } = useQuery({
    queryKey: ["invites", user?.company_id],
    queryFn: () => api.get("invites", { company_id: user?.company_id }),
    enabled: !!user?.company_id
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: any) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      const inviteData = {
        ...data,
        company_id: user?.company_id,
        status: "PENDING",
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      };

      const result = await api.post("invites", inviteData);
      
      await api.log({
        action: 'CREATE',
        entity: 'invites',
        entity_id: result.id,
        description: `Enviou convite para ${data.email}`,
        metadata: inviteData
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Convite enviado com sucesso!");
      setIsModalOpen(false);
    },
    onError: () => {
      toast.error("Erro ao enviar convite.");
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
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    inviteMutation.mutate(data);
  };

  const copyInviteLink = (id: string) => {
    const link = `${window.location.origin}/register?invite=${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de convite copiado!");
  };

  const filteredInvites = invites.filter((i: any) => 
    i.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
            <UserPlus size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Convites de Usuários</h1>
            <p className="text-gray-500">Gerencie os convites para novos membros da sua equipe.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Novo Convite
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por e-mail..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider bg-gray-50/50">
                <th className="px-6 py-4 font-bold">E-mail</th>
                <th className="px-6 py-4 font-bold">Cargo</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Data de Expiração</th>
                <th className="px-6 py-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredInvites.map((invite: any) => (
                <tr key={invite.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Mail size={18} />
                      </div>
                      <span className="font-bold text-gray-900">{invite.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      invite.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {invite.role === "admin" ? "Administrador" : "Usuário"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {invite.status === "PENDING" && (
                        <span className="flex items-center gap-1 text-orange-600 text-xs font-bold">
                          <Clock size={14} />
                          Pendente
                        </span>
                      )}
                      {invite.status === "ACCEPTED" && (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                          <CheckCircle2 size={14} />
                          Aceito
                        </span>
                      )}
                      {invite.status === "EXPIRED" && (
                        <span className="flex items-center gap-1 text-red-600 text-xs font-bold">
                          <XCircle size={14} />
                          Expirado
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {format(new Date(invite.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {invite.status === "PENDING" && (
                        <>
                          <button 
                            onClick={() => copyInviteLink(invite.id)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Copiar Link"
                          >
                            <Copy size={18} />
                          </button>
                          <button 
                            onClick={() => cancelMutation.mutate(invite.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Cancelar Convite"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvites.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Nenhum convite encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-blue-600 text-white">
              <h2 className="text-xl font-bold">Novo Convite</h2>
              <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-transform">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 ml-1">E-mail do Convidado</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    name="email"
                    type="email" 
                    required
                    placeholder="exemplo@email.com"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 ml-1">Cargo</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <select 
                    name="role"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium appearance-none"
                  >
                    <option value="user">Usuário Comum</option>
                    <option value="admin">Administrador da Empresa</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-2xl flex gap-3 items-start">
                <Calendar className="text-blue-600 shrink-0" size={20} />
                <p className="text-xs text-blue-700 leading-relaxed">
                  O convite será válido por 7 dias. Após este período, o link expirará e um novo convite deverá ser enviado.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={inviteMutation.isPending}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {inviteMutation.isPending ? <Loader2 className="animate-spin" size={24} /> : "Enviar Convite"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
