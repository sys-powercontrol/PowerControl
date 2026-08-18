import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ALL_PERMISSIONS, PermissionId } from "../lib/permissions";
import { 
  UserPlus, 
  Search, 
  Edit, 
  UserMinus,
  Mail,
  Shield,
  ShieldCheck,
  BadgeCheck,
  Building2,
  Crown,
  Phone,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Power,
  Trash2,
  UserCheck,
  UserX,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import ConfirmationModal from "../components/ConfirmationModal";
import { InputMask } from "../components/ui/InputMask";

export default function Employees() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const canManage = hasPermission('employees.manage');

  

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [employeeToUnlink, setEmployeeToUnlink] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionId[]>([]);

  const currentCompanyId = api.getCompanyId() || user?.company_id;

  const { data: employees = [], isLoading } = useQuery({ 
    queryKey: ["employees", currentCompanyId], 
    queryFn: () => api.get("users"),
    enabled: !!currentCompanyId
  });

  const filteredEmployees = employees.filter((e: any) => 
    e.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => 
      api.put("users", id, { is_active, active: is_active }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employees", currentCompanyId] });
      toast.success(variables.is_active ? "Funcionário aprovado e liberado com sucesso!" : "Funcionário desativado com sucesso!");
    },
    onError: () => toast.error("Erro ao alterar o status do funcionário.")
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => api.delete("users", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", currentCompanyId] });
      toast.success("Usuário excluído permanentemente!");
      setIsDeleteModalOpen(false);
      setEmployeeToDelete(null);
    },
    onError: () => toast.error("Erro ao excluir funcionário.")
  });

  const employeeMutation = useMutation({
    mutationFn: (data: any) => api.put("users", editingEmployee.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", currentCompanyId] });
      toast.success("Funcionário atualizado!");
      setIsModalOpen(false);
      setEditingEmployee(null);
    }
  });

  const linkMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!currentCompanyId) throw new Error("Nenhuma empresa selecionada.");
      const foundUser: any = await api.findUserByEmail(email);
      if (!foundUser) throw new Error("Usuário não encontrado com este e-mail.");
      
      const existingCompanyIds: string[] = Array.isArray(foundUser.company_ids) && foundUser.company_ids.length > 0
        ? foundUser.company_ids
        : (foundUser.company_id ? [foundUser.company_id] : []);

      if (existingCompanyIds.includes(currentCompanyId)) {
        throw new Error("Este usuário já está vinculado a esta empresa.");
      }

      const newCompanyIds = [...existingCompanyIds, currentCompanyId];
      return api.put("users", foundUser.id, { 
        company_ids: newCompanyIds,
        company_id: foundUser.company_id || currentCompanyId,
        is_active: true,
        active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", currentCompanyId] });
      toast.success("Funcionário vinculado com sucesso!");
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao vincular funcionário.");
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    if (editingEmployee) {
      employeeMutation.mutate({ 
        ...data, 
        active: data.active === "on",
        permissions: selectedPermissions
      });
    } else {
      linkMutation.mutate(data.email as string);
    }
  };

  const handleUnlink = async () => {
    if (!employeeToUnlink || !currentCompanyId) return;
    
    setIsUnlinking(true);
    try {
      const targetEmployee = employees.find((e: any) => e.id === employeeToUnlink);
      const existingCompanyIds: string[] = Array.isArray(targetEmployee?.company_ids) && targetEmployee.company_ids.length > 0
        ? targetEmployee.company_ids
        : (targetEmployee?.company_id ? [targetEmployee.company_id] : []);

      const newCompanyIds = existingCompanyIds.filter((cid: string) => cid !== currentCompanyId);
      const newPrimaryCompanyId = newCompanyIds.length > 0 ? newCompanyIds[0] : null;

      await api.put("users", employeeToUnlink, { 
        company_ids: newCompanyIds,
        company_id: newPrimaryCompanyId
      });
      queryClient.invalidateQueries({ queryKey: ["employees", currentCompanyId] });
      toast.success("Funcionário desvinculado desta empresa!");
      setIsConfirmModalOpen(false);
      setEmployeeToUnlink(null);
    } catch {
      toast.error("Erro ao desvincular funcionário.");
    } finally {
      setIsUnlinking(false);
    }
  };

if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Acesso Restrito</h1>
        <p className="text-gray-500 max-w-md">
          Esta página é restrita a usuários autorizados. Entre em contato com o administrador para solicitar acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funcionários</h1>
          <p className="text-gray-500">Gerencie os usuários vinculados à sua empresa.</p>
        </div>
        <button 
          onClick={() => {
            setEditingEmployee(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-200"
        >
          <UserPlus size={20} />
          Vincular Funcionário
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-gray-500">Carregando funcionários...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            Nenhum funcionário encontrado.
          </div>
        ) : filteredEmployees.map((employee: any) => {
          const isEmployeeActive = employee.is_active !== false && employee.active !== false;

          return (
            <div key={employee.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden">
                    {employee.photo_url ? (
                      <img src={employee.photo_url} alt={employee.full_name} className="w-full h-full object-cover" />
                    ) : (
                      employee.full_name?.charAt(0) || "U"
                    )}
                  </div>
                  <div className="flex gap-1 items-center">
                    {isEmployeeActive ? (
                      <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                        <UserCheck size={12} /> Ativo
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                        <UserX size={12} /> Pendente
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-lg text-gray-900 mb-1 flex items-center gap-2">
                  {employee.full_name}
                  {isEmployeeActive && <BadgeCheck size={18} className="text-blue-500" />}
                </h3>
                
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail size={16} />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone size={16} />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  {employee.document && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FileText size={16} />
                      <span>{employee.document}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Shield size={16} />
                    <span className="flex items-center gap-1">
                      {employee.role === 'master' ? (
                        <span className="text-red-600 font-bold flex items-center gap-1"><Crown size={12} /> Admin Master</span>
                      ) : employee.role === 'admin' ? (
                        <span className="text-purple-600 font-bold flex items-center gap-1"><ShieldCheck size={12} /> Admin Empresa</span>
                      ) : (
                        employee.role || "Funcionário"
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                <div>
                  {!isEmployeeActive && (
                    <button 
                      onClick={() => toggleActiveMutation.mutate({ id: employee.id, is_active: true })}
                      disabled={toggleActiveMutation.isPending}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                      title="Aprovar e Liberar Acesso"
                    >
                      <CheckCircle2 size={14} />
                      Aprovar
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => toggleActiveMutation.mutate({ id: employee.id, is_active: !isEmployeeActive })}
                    disabled={toggleActiveMutation.isPending || employee.id === user?.id}
                    className={`p-2 rounded-xl transition-colors ${
                      isEmployeeActive 
                        ? "text-amber-600 hover:bg-amber-50" 
                        : "text-green-600 hover:bg-green-50"
                    }`}
                    title={isEmployeeActive ? "Desativar Funcionário" : "Ativar Funcionário"}
                  >
                    <Power size={16} />
                  </button>

                  <button 
                    onClick={() => {
                      setEditingEmployee(employee);
                      setSelectedPermissions(employee.permissions || []);
                      setShowPermissions(false);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                    title="Editar Funcionário"
                  >
                    <Edit size={16} />
                  </button>

                  {employee.id !== user?.id && (
                    <>
                      <button 
                        onClick={() => {
                          setEmployeeToUnlink(employee.id);
                          setIsConfirmModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                        title="Desvincular da Empresa"
                      >
                        <UserMinus size={16} />
                      </button>

                      <button 
                        onClick={() => {
                          setEmployeeToDelete(employee);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Excluir Usuário do Sistema"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Vincular/Editar Funcionário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white">
              <h2 className="text-xl font-bold">{editingEmployee ? "Editar Funcionário" : "Vincular Novo Funcionário"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {!editingEmployee ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                    <Building2 className="text-blue-600 shrink-0" size={24} />
                    <p className="text-sm text-blue-800">
                      Para vincular um funcionário, ele já deve ter acessado o sistema pelo menos uma vez com o e-mail informado.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">E-mail do Usuário *</label>
                    <input 
                      name="email" 
                      type="email"
                      required 
                      placeholder="email@exemplo.com"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Nome</label>
                    <input 
                      name="full_name"
                      defaultValue={editingEmployee.full_name}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Telefone</label>
                      <InputMask 
                        name="phone"
                        mask="(00) 00000-0000"
                        defaultValue={editingEmployee.phone}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">CPF</label>
                      <InputMask 
                        name="document"
                        mask="000.000.000-00"
                        defaultValue={editingEmployee.document}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Nível de Acesso</label>
                    <select 
                      name="role" 
                      defaultValue={editingEmployee.role}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                    >
                      <option value="user">Funcionário (Vendedor)</option>
                      <option value="admin">Admin Empresa (Acesso Total)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox" 
                      name="active" 
                      id="active" 
                      defaultChecked={editingEmployee.active}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="active" className="text-sm font-bold text-gray-700">Usuário Ativo</label>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <button 
                      type="button"
                      onClick={() => setShowPermissions(!showPermissions)}
                      className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-purple-600" />
                        Permissões Individuais
                      </div>
                      {showPermissions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {showPermissions && (
                      <div className="mt-4 grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                        {ALL_PERMISSIONS.map(p => (
                          <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                            <input 
                              type="checkbox"
                              checked={selectedPermissions.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPermissions([...selectedPermissions, p.id]);
                                } else {
                                  setSelectedPermissions(selectedPermissions.filter(id => id !== p.id));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-gray-900">{p.name}</p>
                              <p className="text-[10px] text-gray-500">{p.category}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              </div>
              
              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-white shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all cursor-pointer text-sm">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={employeeMutation.isPending || linkMutation.isPending} 
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-sm"
                >
                  {employeeMutation.isPending || linkMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <span>{editingEmployee ? "Salvar Alterações" : "Vincular Funcionário"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleUnlink}
        title="Desvincular Funcionário"
        message="Tem certeza que deseja desvincular este funcionário da sua empresa? Ele perderá o acesso aos dados da empresa."
        isLoading={isUnlinking}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setEmployeeToDelete(null);
        }}
        onConfirm={() => {
          if (employeeToDelete) {
            deleteEmployeeMutation.mutate(employeeToDelete.id);
          }
        }}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir permanentemente o usuário ${employeeToDelete?.full_name || employeeToDelete?.email}? Esta ação removerá a conta do sistema.`}
        confirmText="Excluir Usuário"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteEmployeeMutation.isPending}
      />
    </div>
  );
}
