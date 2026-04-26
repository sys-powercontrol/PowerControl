/// <reference types="vite/client" />
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast, Toaster } from "sonner";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import SellerDashboard from "./pages/SellerDashboard";
import Products from "./pages/Products";
import Sales from "./pages/Sales";
import Clients from "./pages/Clients";
import Cashiers from "./pages/Cashiers";
import AccountsPayable from "./pages/AccountsPayable";
import AccountsReceivable from "./pages/AccountsReceivable";
import Profile from "./pages/Profile";
import AdminMaster from "./pages/AdminMaster";
import GlobalDashboard from "./pages/GlobalDashboard";
import Invite from "./pages/Invite";
import SalesHistory from "./pages/SalesHistory";
import CommissionPayouts from "./pages/CommissionPayouts";
import CertificateManager from "./pages/CertificateManager";
import BankAccounts from "./pages/BankAccounts";
import BankReconciliation from "./pages/BankReconciliation";
import Transfers from "./pages/Transfers";
import Support from "./pages/Support";
import KnowledgeBase from "./pages/KnowledgeBase";
import Services from "./pages/Services";
import Sellers from "./pages/Sellers";
import Suppliers from "./pages/Suppliers";
import Categories from "./pages/Categories";
import Configurations from "./pages/Configurations";
import Fiscal from "./pages/Fiscal";
import TaxSettings from "./pages/TaxSettings";
import Company from "./pages/Company";
import Purchases from "./pages/Purchases";
import PurchaseHistory from "./pages/PurchaseHistory";
import InventoryHistory from "./pages/InventoryHistory";
import InventoryAdjustments from "./pages/InventoryAdjustments";
import InventoryTurnoverReport from "./pages/InventoryTurnoverReport";
import ProfitabilityReport from "./pages/ProfitabilityReport";
import CashFlowReport from "./pages/CashFlowReport";
import Employees from "./pages/Employees";
import { AuthProvider, useAuth } from "./lib/auth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const queryClient = new QueryClient();

export default function App() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'SYNC_COMPLETED') {
          const { synced = 0, failed = 0, abandoned = 0 } = event.data.payload || {};
          
          if (synced > 0) {
            toast.success(`${synced} ${synced === 1 ? 'venda offline sincronizada' : 'vendas offline sincronizadas'} com sucesso!`);
          }
          if (failed > 0) {
            toast.warning(`${failed} ${failed === 1 ? 'venda contínua' : 'vendas continuam'} na fila de retentativa.`);
          }
          if (abandoned > 0) {
            toast.error(`${abandoned} ${abandoned === 1 ? 'venda foi descartada' : 'vendas foram descartadas'} por excesso de falhas persistentes.`);
          }
        } else if (event.data?.type === 'SYNC_ERROR') {
          toast.error(`Falha intermitente de rede no sincronismo: ${event.data.payload?.error}`);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      const handleOnline = () => {
        navigator.serviceWorker.ready.then(registration => {
          if (registration.active) {
            registration.active.postMessage({ type: 'CHECK_SYNC' });
          }
        });
      };
      
      window.addEventListener('online', handleOnline);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
        window.removeEventListener('online', handleOnline);
      };
    }
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <ScrollToTop />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="PainelVendedor" element={<SellerDashboard />} />
              <Route path="Produtos" element={<Products />} />
              <Route path="Categorias" element={<Products defaultTab="Categorias" />} />
              <Route path="Marcas" element={<Products defaultTab="Marcas" />} />
              <Route path="Servicos" element={<Services />} />
              <Route path="AjustesEstoque" element={<InventoryAdjustments />} />
              <Route path="HistoricoEstoque" element={<InventoryHistory />} />
              <Route path="RelatorioGiro" element={<InventoryTurnoverReport />} />
              <Route path="RelatorioLucratividade" element={<ProfitabilityReport />} />
              <Route path="Compras" element={<Purchases />} />
              <Route path="HistoricoCompras" element={<PurchaseHistory />} />
              <Route path="Vender" element={<Sales />} />
              <Route path="HistoricoVendas" element={<SalesHistory />} />
              <Route path="Comissoes" element={<CommissionPayouts />} />
              <Route path="Certificado" element={<CertificateManager />} />
              <Route path="Vendedores" element={<Sellers />} />
              <Route path="Clientes" element={<Clients />} />
              <Route path="Caixas" element={<Cashiers />} />
              <Route path="ContasPagar" element={<AccountsPayable />} />
              <Route path="ContasReceber" element={<AccountsReceivable />} />
              <Route path="RelatorioDRE" element={<CashFlowReport />} />
              <Route path="ContasBancarias" element={<BankAccounts />} />
              <Route path="ConciliacaoBancaria" element={<BankReconciliation />} />
              <Route path="Transferencias" element={<Transfers />} />
              <Route path="Fornecedores" element={<Suppliers />} />
              <Route path="Categorias" element={<Categories />} />
              <Route path="Funcionarios" element={<Employees />} />
              <Route path="Convites" element={<Invite />} />
              <Route path="MeuPerfil" element={<Profile />} />
              <Route path="Empresa" element={<Company />} />
              <Route path="PainelAdminMaster" element={<AdminMaster />} />
              <Route path="DashboardGlobal" element={<GlobalDashboard />} />
              <Route path="Configuracoes" element={<Configurations />} />
              <Route path="ConfiguracoesFiscais" element={<TaxSettings />} />
              <Route path="Fiscal" element={<Fiscal />} />
              <Route path="Suporte" element={<Support />} />
              <Route path="BaseConhecimento" element={<KnowledgeBase />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  );
}
