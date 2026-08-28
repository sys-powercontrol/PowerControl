import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ALL_PERMISSIONS, PermissionId, DEFAULT_ROLE_PERMISSIONS } from "../lib/permissions";
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
  Loader2,
  Users,
  Lock,
  Link2
} from "lucide-react";
import { toast } from "sonner";
import ConfirmationModal from "../components/ConfirmationModal";
import { InputMask } from "../components/ui/InputMask";

export default function Employees() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "admin">("all");

  const canManage = hasPermission('employees.manage');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "link">("create");
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [employeeToUnlink, setEmployeeToUnlink] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionId[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("user");

  const currentCompanyId = api.getCompanyId() || user?.company_id;

  const { data: employees = [], isLoading } = useQuery({ 
    queryKey: ["employees", currentCompanyId], 
    queryFn: () => api.get("users"),
    enabled: !!currentCompanyId
  });

  const getTimestamp = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (val && typeof val.toMillis === 'function') return val.toMillis();
    if (val && typeof val.seconds === 'number') return val.seconds * 1000 + (val.nanoseconds || 0) / 1e6;
    if (val && typeof val._seconds === 'number') return val._seconds * 1000;
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const filteredEmployees = employees
    .filter((e: any) => {
      const matchesSearch = 
        (e.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.document || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.phone || "").toLowerCase().includes(searchTerm.toLowerCase());

      const isEmployeeActive = e.is_active !== false && e.active !== false;

      if (!matchesSearch) return false;
      if (statusFilter === "active") return isEmployeeActive;
      if (statusFilter === "pending") return !isEmployeeActive;
      if (statusFilter === "admin") return e.role === "admin" || e.role === "master";
      return true;
    })
    .sort((a: any, b: any) => {
      const timeA = getTimestamp(a.created_at || a.updated_at || a.admission_date);
      const timeB = getTimestamp(b.created_at || b.updated_at || b.admission_date);
      return timeB - timeA;
    });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => 
      api.put("users", id, { is_active, active: is_active }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employees", currentCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(variables.is_active ? "Funcionário aprovado e ativado com sucesso!" : "Funcionário desativado com sucesso!");
    },
    onError: () => toast.error("Erro ao alterar o status do funcionário.")
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => api.delete("users", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", currentCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário excluído permanentemente!");
      setIsDeleteModalOpen(false);
      setEmployeeToDelete(null);
    },
    onError: () => toast.error("Erro ao excluir funcionário.")
  });

  const saveEmployeeMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (!currentCompanyId) throw new Error("Nenhuma empresa ativa selecionada.");

      const safeRole = (formData.role === "admin" || (editingEmployee?.role === "admin" && !formData.role)) ? "admin" : "user";

      if (editingEmployee) {
        // Update existing user
        return api.put("users", editingEmployee.id, {
          full_name: formData.full_name,
          phone: formData.phone || null,
          document: formData.document || null,
          role: editingEmployee.role === "master" ? "master" : safeRole,
          is_active: formData.is_active,
          active: formData.is_active,
          permissions: selectedPermissions
        });
      } else if (modalMode === "create") {
        // Check if user with this email already exists
        const cleanEmail = (formData.email || "").trim().toLowerCase();
        if (!cleanEmail) throw new Error("E-mail é obrigatório.");

        const existing = await api.findUserByEmail(cleanEmail);
        if (existing) {
          // Link existing user to current company
          const currentCompanyIds: string[] = Array.isArray(existing.company_ids) && existing.company_ids.length > 0
            ? existing.company_ids
            : (existing.company_id ? [existing.company_id] : []);

          if (currentCompanyIds.includes(currentCompanyId)) {
            throw new Error("Este usuário já está vinculado a esta empresa.");
          }

          const newCompanyIds = [...currentCompanyIds, currentCompanyId];
          return api.put("users", existing.id, {
            company_ids: newCompanyIds,
            company_id: existing.company_id || currentCompanyId,
            is_active: true,
            active: true
          });
        }

        // Create new user in Firestore linked to this company
        const initialPermissions = selectedPermissions.length > 0 
          ? selectedPermissions 
          : (safeRole === "admin" ? DEFAULT_ROLE_PERMISSIONS.admin : DEFAULT_ROLE_PERMISSIONS.user);

        return api.post("users", {
          full_name: formData.full_name || cleanEmail.split("@")[0],
          email: cleanEmail,
          password: formData.password || "123456",
          phone: formData.phone || null,
          document: formData.document || null,
          role: safeRole,
          company_id: currentCompanyId,
          company_ids: [currentCompanyId],
          is_active: formData.is_active !== false,
          active: formData.is_active !== false,
          permissions: initialPermissions,
          created_at: new Date().toISOString()
        });
      } else {
        // Link mode by email
        const cleanEmail = (formData.email || "").trim().toLowerCase();
        if (!cleanEmail) throw new Error("E-mail é obrigatório.");

        const foundUser: any = await api.findUserByEmail(cleanEmail);
        if (!foundUser) {
          throw new Error("Nenhum usuário encontrado com este e-mail. Use a opção 'Cadastrar Novo' para criar.");
        }

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
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", currentCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(editingEmployee ? "Funcionário atualizado com sucesso!" : "Funcionário cadastrado e vinculado com sucesso!");
      setIsModalOpen(false);
      setEditingEmployee(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar funcionário.");
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawData = Object.fromEntries(formData.entries());

    saveEmployeeMutation.mutate({
      ...rawData,
      is_active: rawData.active === "on" || rawData.active === "true" || !editingEmployee
    });
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    if (role === "admin") {
      setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS.admin);
    } else {
      setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS.user);
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

      await api.log({
        action: 'DELETE',
        entity: 'employees',
        entity_id: employeeToUnlink,
        description: `Desvinculou colaborador ${targetEmployee?.full_name || targetEmployee?.email || employeeToUnlink} da empresa`,
        metadata: {
          employee_id: employeeToUnlink,
          employee_name: targetEmployee?.full_name,
          employee_email: targetEmployee?.email,
          previous_companies: existingCompanyIds,
          updated_companies: newCompanyIds
        }
      });
      queryClient.invalidateQueries({ queryKey: ["employees", currentCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Funcionário desvinculado desta empresa com sucesso!");
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

  const activeCount = employees.filter((e: any) => e.is_active !== false && e.active !== false).length;
  const pendingCount = employees.filter((e: any) => e.is_active === false || e.active === false).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Funcionários e Equipe</h1>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
              {employees.length} {employees.length === 1 ? 'vinculado' : 'vinculados'}
            </span>
          </div>
          <p className="text-gray-500 mt-1">Gerencie os usuários vinculados à sua empresa e configure suas permissões.</p>
        </div>
        <button 
          onClick={() => {
            setEditingEmployee(null);
            setModalMode("create");
            setSelectedRole("user");
            setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS.user);
            setShowPermissions(false);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
        >
          <UserPlus size={20} />
          Cadastrar Funcionário
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, e-mail, CPF ou telefone..." 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl shrink-0 overflow-x-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Todos ({employees.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "active" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Ativos ({activeCount})
          </button>
          {pendingCount > 0 && (
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "pending" ? "bg-white text-amber-700 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Pendentes ({pendingCount})
            </button>
          )}
          <button
            onClick={() => setStatusFilter("admin")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === "admin" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Gestores
          </button>
        </div>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="font-medium">Carregando usuários e funcionários...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-3xl border border-gray-100 p-8 flex flex-col items-center justify-center">
            <Users size={48} className="text-gray-300 mb-3" />
            <h3 className="text-lg font-bold text-gray-700">Nenhum funcionário encontrado</h3>
            <p className="text-sm text-gray-500 max-w-md mt-1">
              {searchTerm 
                ? "Nenhum resultado corresponde aos termos da busca." 
                : "Cadastre ou vincule funcionários para que possam acessar os recursos desta empresa."}
            </p>
            <button
              onClick={() => {
                setEditingEmployee(null);
                setModalMode("create");
                setIsModalOpen(true);
              }}
              className="mt-5 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-500/20"
            >
              Adicionar Primeiro Funcionário
            </button>
          </div>
        ) : filteredEmployees.map((employee: any) => {
          const isEmployeeActive = employee.is_active !== false && employee.active !== false;

          return (
            <div key={employee.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
                    {employee.photo_url || employee.avatar ? (
                      <img src={employee.photo_url || employee.avatar} alt={employee.full_name} className="w-full h-full object-cover" />
                    ) : (
                      employee.full_name?.charAt(0)?.toUpperCase() || "U"
                    )}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    {isEmployeeActive ? (
                      <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200/60 rounded-full text-[11px] font-bold uppercase flex items-center gap-1">
                        <UserCheck size={13} /> Ativo
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-full text-[11px] font-bold uppercase flex items-center gap-1">
                        <UserX size={13} /> Pendente
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-lg text-gray-900 mb-1 flex items-center gap-2">
                  <span className="truncate">{employee.full_name || "Sem Nome"}</span>
                  {isEmployeeActive && <BadgeCheck size={18} className="text-blue-500 shrink-0" />}
                </h3>
                
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={15} className="text-gray-400 shrink-0" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={15} className="text-gray-400 shrink-0" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  {employee.document && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FileText size={15} className="text-gray-400 shrink-0" />
                      <span>{employee.document}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Shield size={15} className="text-gray-400 shrink-0" />
                    <span className="flex items-center gap-1">
                      {employee.role === 'master' ? (
                        <span className="text-red-600 font-bold flex items-center gap-1"><Crown size={13} /> Administrador Master</span>
                      ) : employee.role === 'admin' ? (
                        <span className="text-purple-600 font-bold flex items-center gap-1"><ShieldCheck size={13} /> Gestor da Empresa</span>
                      ) : (
                        <span className="text-gray-700 font-medium">{employee.role === 'user' ? 'Funcionário / Vendedor' : (employee.role || "Funcionário")}</span>
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
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-green-500/20 transition-all cursor-pointer"
                      title="Aprovar e Liberar Acesso"
                    >
                      <CheckCircle2 size={14} />
                      Aprovar Acesso
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => toggleActiveMutation.mutate({ id: employee.id, is_active: !isEmployeeActive })}
                    disabled={toggleActiveMutation.isPending || employee.id === user?.id}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
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
                      setSelectedRole(employee.role || "user");
                      setSelectedPermissions(employee.permissions || (employee.role === "admin" ? DEFAULT_ROLE_PERMISSIONS.admin : DEFAULT_ROLE_PERMISSIONS.user));
                      setShowPermissions(false);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                    title="Editar Funcionário e Permissões"
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
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors cursor-pointer"
                        title="Desvincular desta Empresa"
                      >
                        <UserMinus size={16} />
                      </button>

                      <button 
                        onClick={() => {
                          setEmployeeToDelete(employee);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Excluir Usuário Permanentemente"
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
          <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingEmployee ? "Editar Funcionário" : "Adicionar Funcionário à Empresa"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingEmployee ? `Atualizando dados de ${editingEmployee.full_name || editingEmployee.email}` : "Cadastre uma nova conta ou vincule um usuário existente."}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1">✕</button>
            </div>

            {!editingEmployee && (
              <div className="flex border-b border-gray-100 bg-gray-50 px-6 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode("create")}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    modalMode === "create" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <UserPlus size={16} />
                  Cadastrar Novo
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode("link")}
                  className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                    modalMode === "link" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Link2 size={16} />
                  Vincular por E-mail
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {!editingEmployee && modalMode === "link" ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                      <Building2 className="text-blue-600 shrink-0" size={24} />
                      <p className="text-sm text-blue-800">
                        Informe o e-mail de um usuário cadastrado no sistema para vincular o acesso dele à empresa ativa.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">E-mail do Usuário *</label>
                      <input 
                        name="email" 
                        type="email" 
                        required 
                        placeholder="email@exemplo.com"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!editingEmployee && (
                      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-800 flex items-center gap-2">
                        <Users size={16} className="text-blue-600 shrink-0" />
                        <span>O funcionário terá acesso imediato aos módulos configurados para esta empresa.</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-sm font-bold text-gray-700">Nome Completo *</label>
                        <input 
                          name="full_name"
                          required
                          defaultValue={editingEmployee?.full_name || ""}
                          placeholder="Ex: João da Silva"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700">E-mail {editingEmployee ? "" : "*"}</label>
                        <input 
                          name="email" 
                          type="email"
                          required={!editingEmployee}
                          disabled={!!editingEmployee}
                          defaultValue={editingEmployee?.email || ""}
                          placeholder="usuario@empresa.com"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:text-gray-500" 
                        />
                      </div>

                      {!editingEmployee && (
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                            <Lock size={14} className="text-gray-400" />
                            Senha Inicial
                          </label>
                          <input 
                            name="password" 
                            type="password"
                            placeholder="Mínimo 6 dígitos (padrão: 123456)"
                            defaultValue="123456"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700">Telefone / WhatsApp</label>
                        <InputMask 
                          name="phone"
                          mask="(00) 00000-0000"
                          defaultValue={editingEmployee?.phone || ""}
                          placeholder="(11) 99999-9999"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700">CPF / Documento</label>
                        <InputMask 
                          name="document"
                          mask="000.000.000-00"
                          defaultValue={editingEmployee?.document || ""}
                          placeholder="000.000.000-00"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-700">Cargo / Nível de Acesso</label>
                      <select 
                        name="role" 
                        value={selectedRole}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white cursor-pointer" 
                      >
                        <option value="user">Funcionário (Vendas, Produtos, Clientes conforme permissões)</option>
                        <option value="admin">Gestor / Administrador da Empresa (Acesso Total)</option>
                      </select>
                    </div>

                    {editingEmployee && (
                      <div className="flex items-center gap-2 pt-1">
                        <input 
                          type="checkbox" 
                          name="active" 
                          id="active" 
                          defaultChecked={editingEmployee.is_active !== false && editingEmployee.active !== false}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="active" className="text-sm font-bold text-gray-700 cursor-pointer">
                          Acesso Ativo e Liberado
                        </label>
                      </div>
                    )}

                    {/* Permissions Section */}
                    <div className="pt-3 border-t border-gray-100">
                      <button 
                        type="button"
                        onClick={() => setShowPermissions(!showPermissions)}
                        className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={18} className="text-purple-600" />
                          Permissões e Módulos ({selectedPermissions.length} selecionadas)
                        </div>
                        {showPermissions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>

                      {showPermissions && (
                        <div className="mt-3 p-3 bg-gray-50/50 rounded-2xl border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-2">
                          {ALL_PERMISSIONS.map(p => (
                            <label key={p.id} className="flex items-start gap-2.5 p-2 bg-white hover:bg-blue-50/50 rounded-xl border border-gray-100 cursor-pointer transition-colors">
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
                                className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer shrink-0"
                              />
                              <div>
                                <p className="text-xs font-bold text-gray-900">{p.name}</p>
                                <p className="text-[10px] text-gray-500 leading-tight">{p.category}</p>
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
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all cursor-pointer text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saveEmployeeMutation.isPending} 
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-sm"
                >
                  {saveEmployeeMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{editingEmployee ? "Salvar Alterações" : (modalMode === "create" ? "Cadastrar Funcionário" : "Vincular Funcionário")}</span>
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
        message="Tem certeza que deseja desvincular este funcionário da sua empresa? Ele perderá o acesso aos dados desta empresa."
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
