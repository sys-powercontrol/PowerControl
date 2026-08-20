import { 
  ShoppingCart, 
  Package, 
  LayoutDashboard, 
  Users, 
  Wallet, 
  CreditCard, 
  Search, 
  Truck,
  Keyboard
} from "lucide-react";
import React from "react";

export interface ShortcutItem {
  keyCombo: string;
  description: string;
  category: "Navegação" | "Operacional" | "Sistema";
  path?: string;
  actionName?: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}

export const SYSTEM_SHORTCUTS: ShortcutItem[] = [
  { keyCombo: "Ctrl + P", description: "Abrir PDV / Nova Venda", category: "Operacional", path: "/Vender", icon: ShoppingCart },
  { keyCombo: "Ctrl + E", description: "Ir para Catálogo de Produtos", category: "Navegação", path: "/Produtos", icon: Package },
  { keyCombo: "Ctrl + D", description: "Ir para o Dashboard Executive", category: "Navegação", path: "/", icon: LayoutDashboard },
  { keyCombo: "Ctrl + Shift + C", description: "Ir para Gestão de Clientes", category: "Navegação", path: "/Clientes", icon: Users },
  { keyCombo: "Ctrl + Shift + F", description: "Ir para Contas a Pagar / Financeiro", category: "Navegação", path: "/ContasPagar", icon: Wallet },
  { keyCombo: "Ctrl + Shift + X", description: "Gerenciar Caixas e Operações", category: "Operacional", path: "/Caixas", icon: CreditCard },
  { keyCombo: "Ctrl + Shift + B", description: "Ir para Compras e Entradas", category: "Operacional", path: "/Compras", icon: Truck },
  { keyCombo: "Ctrl + K", description: "Abrir Busca Global Inteligente", category: "Sistema", actionName: "search", icon: Search },
  { keyCombo: "Alt + H ou ?", description: "Abrir este Guia de Atalhos", category: "Sistema", actionName: "help", icon: Keyboard },
];
