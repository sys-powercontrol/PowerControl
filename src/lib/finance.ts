import { addWeeks, addMonths, addYears, parseISO } from "date-fns";
import { formatBR } from "./dateUtils";
import { db } from "./firebase";
import { doc, runTransaction, collection } from "firebase/firestore";

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
      created_at: new Date().toISOString()
    };
    
    transaction.set(movementRef, movementData);
    
    return { id: movementRef.id, ...movementData };
  });
}
