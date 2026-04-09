export interface AuditLog {
  id: string;
  timestamp: any;
  user_id: string;
  user_name: string;
  company_id: string | null;
  company_name: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'OTHER';
  entity: string;
  entity_id: string;
  description: string;
  metadata?: any;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'master' | 'admin' | 'user';
  company_id: string | null;
  is_active: boolean;
  phone?: string;
  cpf?: string;
  created_at: any;
}

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  is_active: boolean;
  logo_url?: string | null;
  created_at: any;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  product_name: string;
  company_id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  reason: 'SALE' | 'PURCHASE' | 'MANUAL' | 'TRANSFER' | 'RETURN' | 'CANCEL' | 'QUEBRA' | 'PERDA' | 'INVENTARIO' | 'BONIFICACAO';
  quantity: number;
  previous_stock: number;
  current_stock: number;
  reference_id?: string;
  observation?: string;
  user_id: string;
  user_name: string;
  timestamp: any;
}

export interface AccountReceivable {
  id: string;
  company_id: string;
  client_id: string;
  client_name: string;
  sale_id: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';
  created_at: any;
  receipt_date?: string;
  bank_account_id?: string;
  cashier_id?: string;
}

export interface AccountPayable {
  id: string;
  company_id: string;
  supplier_id?: string;
  supplier_name?: string;
  purchase_id?: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';
  created_at: any;
  payment_date?: string;
  bank_account_id?: string;
  cashier_id?: string;
}

export interface Sale {
  id: string;
  sale_number?: string;
  client_id: string;
  client_name: string;
  items: any[];
  total: number;
  subtotal: number;
  discount: number;
  payment_method: string;
  seller_id: string;
  seller_name: string;
  commission_amount: number;
  commission_status: 'pending' | 'paid';
  company_id: string;
  created_at: any;
  sale_date: string;
}

export interface ReconciliationRule {
  id: string;
  company_id: string;
  pattern: string;
  type: 'EXACT' | 'CONTAINS' | 'REGEX';
  target_type: 'PAYABLE' | 'RECEIVABLE';
  category_id?: string;
  category_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  client_id?: string;
  client_name?: string;
  auto_confirm: boolean;
  created_at: any;
}
