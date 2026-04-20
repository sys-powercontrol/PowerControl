import { addWeeks, addMonths, addYears, parseISO } from "date-fns";
import { formatBR } from "./dateUtils";
import { db } from "./firebase";
import { doc, runTransaction, collection, serverTimestamp } from "firebase/firestore";

export type Frequency = "WEEKLY" | "MONTHLY" | "YEARLY";

export function calculateNextDueDate(currentDueDate: string, frequency: Frequency): string {
  const date = parseISO(currentDueDate);
  let nextDate: Date;

  switch (frequency) {
    case "WEEKLY":
      nextDate = addWeeks(date, 1);
      break;
    case "MONTHLY":
      nextDate = addMonths(date, 1);
      break;
    case "YEARLY":
      nextDate = addYears(date, 1);
      break;
    default:
      nextDate = addMonths(date, 1);
  }

  return formatBR(nextDate, "yyyy-MM-dd");
}

export async function processMovement(data: any) {
  return runTransaction(db, async (transaction) => {
    const amount = parseFloat(data.amount);
    
    // Validate accounts
    let fromAccountRef = null;
    let toAccountRef = null;
    let fromAccountData = null;
    let toAccountData = null;

    if (data.type === "Transferência" || data.type === "Saída") {
      if (!data.from_account_id || !data.from_account_type) throw new Error("Conta de origem inválida");
      const collectionName = data.from_account_type === "Banco" ? "bankAccounts" : "cashiers";
      fromAccountRef = doc(db, collectionName, data.from_account_id);
      const docSnap = await transaction.get(fromAccountRef);
      if (!docSnap.exists()) throw new Error("Conta de origem não encontrada");
      fromAccountData = docSnap.data();
    }

    if (data.type === "Transferência" || data.type === "Entrada") {
      if (!data.to_account_id || !data.to_account_type) throw new Error("Conta de destino inválida");
      const collectionName = data.to_account_type === "Banco" ? "bankAccounts" : "cashiers";
      toAccountRef = doc(db, collectionName, data.to_account_id);
      const docSnap = await transaction.get(toAccountRef);
      if (!docSnap.exists()) throw new Error("Conta de destino não encontrada");
      toAccountData = docSnap.data();
    }

    // Update balances
    if (fromAccountRef && fromAccountData) {
      transaction.update(fromAccountRef, {
        balance: (fromAccountData.balance || 0) - amount
      });
    }

    if (toAccountRef && toAccountData) {
      transaction.update(toAccountRef, {
        balance: (toAccountData.balance || 0) + amount
      });
    }

    // Create movement record
    const movementRef = doc(collection(db, "movements"));
    const movementData = {
      ...data,
      amount,
      movement_date: new Date().toISOString(),
      created_at: serverTimestamp()
    };
    
    transaction.set(movementRef, movementData);
    
    return { id: movementRef.id, ...movementData };
  });
}

export async function processAccountPayment(accountId: string, accountData: any, paymentData: { type: string, id: string }) {
  return runTransaction(db, async (transaction) => {
    const amount = parseFloat(accountData.amount);
    if (isNaN(amount)) throw new Error("Valor do pagamento inválido");
    
    // Validate account
    const collectionName = paymentData.type === "bank" ? "bankAccounts" : "cashiers";
    const paymentAccountRef = doc(db, collectionName, paymentData.id);
    const docSnap = await transaction.get(paymentAccountRef);
    if (!docSnap.exists()) throw new Error("Conta de pagamento não encontrada");
    const paymentAccountData = docSnap.data();

    // Update balance
    transaction.update(paymentAccountRef, {
      balance: (paymentAccountData.balance || 0) - amount
    });

    // Update account payable
    const payableRef = doc(db, "accountsPayable", accountId);
    transaction.update(payableRef, {
      status: "Pago",
      payment_date: new Date().toISOString(),
      bank_account_id: paymentData.type === 'bank' ? paymentData.id : null,
      cashier_id: paymentData.type === 'cashier' ? paymentData.id : null
    });

    // Create movement record
    const movementRef = doc(collection(db, "movements"));
    transaction.set(movementRef, {
      company_id: accountData.company_id,
      type: "Saída",
      description: `Pagamento: ${accountData.description}`,
      amount: amount,
      from_account_type: paymentData.type === 'bank' ? 'Banco' : 'Caixa',
      from_account_id: paymentData.id,
      from_account_name: paymentAccountData.name || "Conta Desconhecida",
      category: "Pagamento de Contas",
      movement_date: new Date().toISOString(),
      created_at: serverTimestamp()
    });

    return { success: true };
  });
}

export async function processAccountReceipt(accountId: string, accountData: any, receiptData: { type: string, id: string }) {
  return runTransaction(db, async (transaction) => {
    const amount = parseFloat(accountData.amount);
    if (isNaN(amount)) throw new Error("Valor do recebimento inválido");
    
    // Validate account
    const collectionName = receiptData.type === "bank" ? "bankAccounts" : "cashiers";
    const receiptAccountRef = doc(db, collectionName, receiptData.id);
    const docSnap = await transaction.get(receiptAccountRef);
    if (!docSnap.exists()) throw new Error("Conta de recebimento não encontrada");
    const receiptAccountData = docSnap.data();

    // Update balance
    transaction.update(receiptAccountRef, {
      balance: (receiptAccountData.balance || 0) + amount
    });

    // Update account receivable
    const receivableRef = doc(db, "accountsReceivable", accountId);
    transaction.update(receivableRef, {
      status: "Recebido",
      receipt_date: new Date().toISOString(),
      bank_account_id: receiptData.type === 'bank' ? receiptData.id : null,
      cashier_id: receiptData.type === 'cashier' ? receiptData.id : null
    });

    // Create movement record
    const movementRef = doc(collection(db, "movements"));
    transaction.set(movementRef, {
      company_id: accountData.company_id,
      type: "Entrada",
      description: `Recebimento: ${accountData.description}`,
      amount: amount,
      to_account_type: receiptData.type === 'bank' ? 'Banco' : 'Caixa',
      to_account_id: receiptData.id,
      to_account_name: receiptAccountData.name || "Conta Desconhecida",
      category: "Recebimento de Contas",
      movement_date: new Date().toISOString(),
      created_at: serverTimestamp()
    });

    return { success: true };
  });
}

// ---- Reversal Utilities ----

export async function reverseAccountReceipt(accountData: any) {
  return runTransaction(db, async (transaction) => {
    const amount = parseFloat(accountData.amount);
    if (isNaN(amount) || !amount) return { success: true };

    const accountId = accountData.bank_account_id || accountData.cashier_id;
    if (!accountId) return { success: true }; 

    const collectionName = accountData.bank_account_id ? "bankAccounts" : "cashiers";
    const receiptAccountRef = doc(db, collectionName, accountId);
    const docSnap = await transaction.get(receiptAccountRef);
    if (!docSnap.exists()) return { success: true }; 

    const receiptAccountData = docSnap.data();

    // Deduct balance
    const currentBalance = receiptAccountData.balance || 0;
    transaction.update(receiptAccountRef, {
      balance: currentBalance - amount
    });

    // Create reversal movement record
    const movementRef = doc(collection(db, "movements"));
    transaction.set(movementRef, {
      company_id: accountData.company_id,
      type: "Saída",
      description: `Estorno de Exclusão: ${accountData.description || 'Conta a Receber'}`,
      amount: amount,
      from_account_type: accountData.bank_account_id ? 'Banco' : 'Caixa',
      from_account_id: accountId,
      from_account_name: receiptAccountData.name || "Conta Desconhecida",
      category: "Estorno",
      movement_date: new Date().toISOString(),
      created_at: serverTimestamp()
    });

    return { success: true };
  });
}

export async function reverseSalePayment(saleData: any) {
  return runTransaction(db, async (transaction) => {
    const amount = parseFloat(saleData.total);
    if (isNaN(amount) || !amount) return { success: true };

    const accountId = saleData.bank_account_id || saleData.cashier_id;
    if (!accountId) return { success: true };

    const collectionName = saleData.bank_account_id ? "bankAccounts" : "cashiers";
    const receiptAccountRef = doc(db, collectionName, accountId);
    const docSnap = await transaction.get(receiptAccountRef);
    if (!docSnap.exists()) return { success: true };

    const receiptAccountData = docSnap.data();

    // Deduct balance
    const currentBalance = receiptAccountData.balance || 0;
    transaction.update(receiptAccountRef, {
      balance: currentBalance - amount
    });

    const movementRef = doc(collection(db, "movements"));
    transaction.set(movementRef, {
      company_id: saleData.company_id,
      type: "Saída",
      description: `Estorno (Cancelamento/Exclusão Venda): #${saleData.id?.substring(0, 8).toUpperCase()}`,
      amount: amount,
      from_account_type: saleData.bank_account_id ? 'Banco' : 'Caixa',
      from_account_id: accountId,
      from_account_name: receiptAccountData.name || "Conta Desconhecida",
      category: "Estorno",
      movement_date: new Date().toISOString(),
      created_at: serverTimestamp()
    });

    return { success: true };
  });
}

export async function reversePurchasePayment(purchaseData: any) {
  return runTransaction(db, async (transaction) => {
    const amount = parseFloat(purchaseData.total);
    if (isNaN(amount) || !amount) return { success: true };

    const accountId = purchaseData.bank_account_id || purchaseData.cashier_id;
    if (!accountId) return { success: true };

    const collectionName = purchaseData.bank_account_id ? "bankAccounts" : "cashiers";
    const paymentAccountRef = doc(db, collectionName, accountId);
    const docSnap = await transaction.get(paymentAccountRef);
    if (!docSnap.exists()) return { success: true };

    const paymentAccountData = docSnap.data();

    // Add back balance
    const currentBalance = paymentAccountData.balance || 0;
    transaction.update(paymentAccountRef, {
      balance: currentBalance + amount
    });

    const movementRef = doc(collection(db, "movements"));
    transaction.set(movementRef, {
      company_id: purchaseData.company_id,
      type: "Entrada",
      description: `Estorno (Cancelamento/Exclusão Compra): #${purchaseData.purchase_number || purchaseData.id?.substring(0, 8).toUpperCase()}`,
      amount: amount,
      to_account_type: purchaseData.bank_account_id ? 'Banco' : 'Caixa',
      to_account_id: accountId,
      to_account_name: paymentAccountData.name || "Conta Desconhecida",
      category: "Estorno",
      movement_date: new Date().toISOString(),
      created_at: serverTimestamp()
    });

    return { success: true };
  });
}
