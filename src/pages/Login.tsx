import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { auth } from "../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { Shield, Mail, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, isLoading: isAuthLoading, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showInitialSpinner, setShowInitialSpinner] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitialSpinner(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !showInitialSpinner && user) {
      navigate("/");
    }
  }, [isAuthLoading, showInitialSpinner, user, navigate]);

  if (showInitialSpinner || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600"></div>
            <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={24} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-gray-900">PowerControl</h2>
            <p className="text-gray-500 font-medium animate-pulse">Iniciando sistema seguro...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      await api.log({
        action: 'LOGIN',
        entity: 'users',
        description: `Usuário realizou login via e-mail`
      });
      toast.success("Bem-vindo de volta!");
      navigate("/");
    } catch (error) {
      toast.error("E-mail ou senha incorretos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      await api.log({
        action: 'LOGIN',
        entity: 'users',
        description: `Usuário realizou login via Google`
      });
    } catch (error) {
      toast.error("Erro ao entrar com Google.");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Por favor, informe seu e-mail.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("E-mail de recuperação enviado!");
    } catch (error) {
      toast.error("Erro ao enviar e-mail de recuperação.");
    }
  };

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
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">PowerControl</h1>
          <p className="text-gray-500 font-medium">Gestão empresarial inteligente e simplificada.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">E-mail de Acesso</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">Lembrar de mim</span>
              </label>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : "Entrar no Sistema"}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-400">Ou entre com</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="mt-6 w-full py-3 px-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-3 shadow-sm"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Entrar com Google
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Não tem uma conta?{" "}
              <Link to="/register" className="text-blue-600 font-bold hover:underline">
                Cadastre-se agora
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

