/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
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
import Services from "./pages/Services";
import Sellers from "./pages/Sellers";
import Suppliers from "./pages/Suppliers";
import Configurations from "./pages/Configurations";
import Fiscal from "./pages/Fiscal";
import TaxSettings from "./pages/TaxSettings";
import Company from "./pages/Company";
import Purchases from "./pages/Purchases";
import PurchaseHistory from "./pages/PurchaseHistory";
import InventoryHistory from "./pages/InventoryHistory";
import InventoryAdjustments from "./pages/InventoryAdjustments";
import InventoryTurnoverReport from "./pages/InventoryTurnoverReport";
import CashFlowReport from "./pages/CashFlowReport";
import Employees from "./pages/Employees";
import { AuthProvider, useAuth } from "./lib/auth";
import Login from "./pages/Login";
import Register from "./pages/Register";

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
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="PainelVendedor" element={<SellerDashboard />} />
              <Route path="Produtos" element={<Products />} />
              <Route path="Servicos" element={<Services />} />
              <Route path="AjustesEstoque" element={<InventoryAdjustments />} />
              <Route path="HistoricoEstoque" element={<InventoryHistory />} />
              <Route path="RelatorioGiro" element={<InventoryTurnoverReport />} />
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </QueryClientProvider>
    </AuthProvider>
  );
}
