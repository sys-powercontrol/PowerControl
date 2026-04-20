import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { Shield, Mail, Lock, User, Phone, FileText, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { InputMask } from "../components/ui/InputMask";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get("invite");
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);
  const [isInviteLoading, setIsInviteLoading] = useState(!!inviteId);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    cpf: "",
  });

  useEffect(() => {
    if (inviteId) {
      const fetchInvite = async () => {
        try {
          const invite = await api.get("invites", inviteId);
          if (invite.status !== "PENDING") {
            toast.error("Este convite já foi utilizado ou expirou.");
            setInviteData(null);
          } else if (new Date(invite.expires_at) < new Date()) {
            toast.error("Este convite expirou.");
            setInviteData(null);
          } else {
            setInviteData(invite);
            setFormData(prev => ({ ...prev, email: invite.email }));
          }
        } catch (error) {
          console.error("Error fetching invite:", error);
          toast.error("Convite inválido.");
        } finally {
          setIsInviteLoading(false);
        }
      };
      fetchInvite();
    }
  }, [inviteId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleMaskChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register({ ...formData, invite_id: inviteId });
      if (inviteId && inviteData) {
        toast.success(`Bem-vindo à ${inviteData.company_name || "sua nova empresa"}!`);
        navigate("/");
      } else {
        toast.success("Conta criada com sucesso! Agora vincule sua empresa.");
        navigate("/MeuPerfil");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Erro ao criar conta. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isInviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-200 mb-4">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {inviteData ? "Aceite seu Convite" : "Crie sua Conta"}
          </h1>
          <p className="text-gray-500 font-medium">
            {inviteData 
              ? `Você foi convidado para se juntar como ${inviteData.role === 'admin' ? 'Administrador' : 'Usuário'}.` 
              : "Comece a gerir sua empresa de forma inteligente."}
          </p>
        </div>

        {inviteId && !inviteData && !isInviteLoading && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-center text-red-700">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">Este link de convite não é mais válido.</p>
          </div>
        )}

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 ml-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  name="full_name"
                  type="text" 
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Seu nome completo"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  name="email"
                  type="email" 
                  required
                  disabled={!!inviteData}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  className={`w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium ${inviteData ? "opacity-70 cursor-not-allowed" : ""}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 ml-1">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
                  <InputMask 
                    name="phone"
                    mask="(00) 00000-0000"
                    required
                    value={formData.phone}
                    onChange={(val) => handleMaskChange("phone", val)}
                    placeholder="(00) 00000-0000"
                    className="pl-11 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 ml-1">CPF</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
                  <InputMask 
                    name="cpf"
                    mask="000.000.000-00"
                    required
                    value={formData.cpf}
                    onChange={(val) => handleMaskChange("cpf", val)}
                    placeholder="000.000.000-00"
                    className="pl-11 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  name="password"
                  type="password" 
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : "Criar Minha Conta"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-blue-600 font-bold hover:underline">
                Faça login
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm">
          © 2026 PowerControl. Todos os direitos reservados.
        </p>
      </div>
    </motion.div>
  );
}
