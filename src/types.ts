import { FieldValue } from 'firebase/firestore';

export type FirebaseTimestamp = string | number | { seconds: number, nanoseconds: number } | Date | FieldValue;

export interface AuditLog {
  id: string;
  timestamp: FirebaseTimestamp;
  user_id: string;
  user_name: string;
  company_id: string | null;
  company_name: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'OTHER';
  entity: string;
  entity_id: string;
  description: string;
  changes?: Record<string, unknown> | string;
  metadata?: Record<string, unknown>;
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
  address?: string;
  avatar?: string;
  created_at: FirebaseTimestamp;
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
  created_at: FirebaseTimestamp;
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
  reconciliation_id?: string;
  observation?: string;
  user_id: string;
  user_name: string;
  timestamp: FirebaseTimestamp;
}

export interface AccountReceivable {
  id: string;
  company_id: string;
  client_id: string;
  client_name: string;
  sale_id: string;
  reconciliation_id?: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';
  is_unmapped?: boolean;
  created_at: FirebaseTimestamp;
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
  reconciliation_id?: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';
  created_at: FirebaseTimestamp;
  payment_date?: string;
  bank_account_id?: string;
  cashier_id?: string;
}

export interface SaleItem {
  id: string;
  product_id?: string;
  service_id?: string;
  name: string;
  quantity: number;
  price: number;
  cost_price?: number;
  total: number;
  type: 'product' | 'service';
  [key: string]: unknown; // Allow extensions without strictly breaking old entries
}

export interface Sale {
  id: string;
  sale_number?: string;
  client_id: string;
  client_name: string;
  items: SaleItem[];
  total: number;
  subtotal: number;
  discount: number;
  payment_method: string;
  seller_id: string;
  seller_name: string;
  commission_amount: number;
  commission_status: 'pending' | 'paid';
  company_id: string;
  created_at: FirebaseTimestamp;
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
  created_at: FirebaseTimestamp;
}

export interface SupportTicket {
  id: string;
  company_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  internal_notes?: string;
  created_at: FirebaseTimestamp;
  updated_at: FirebaseTimestamp;
}
