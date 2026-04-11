import { api } from "./api";
import { InventoryMovement } from "../types";
import { serverTimestamp, runTransaction, doc, collection } from "firebase/firestore";
import { db } from "./firebase";

const cleanObject = (obj: any) => {
  const newObj = { ...obj };
  Object.keys(newObj).forEach(key => {
    if (newObj[key] === undefined) {
      delete newObj[key];
    }
  });
  return newObj;
};

export const inventory = {
  async recordMovement(data: Omit<InventoryMovement, "id" | "timestamp" | "user_id" | "user_name" | "previous_stock" | "current_stock">, userContext?: any) {
    const user = userContext || api.getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado");

    return runTransaction(db, async (transaction) => {
      // 1. Get current product to find previous stock
      const productRef = doc(db, "products", data.product_id);
      const productDoc = await transaction.get(productRef);
      
      if (!productDoc.exists()) throw new Error("Produto não encontrado");
      
      const productData = productDoc.data();
      const previous_stock = productData.stock_quantity || 0;
      
      // 2. Calculate current stock
      let quantityChange = data.quantity;
      if (data.type === 'OUT') quantityChange = -data.quantity;
      
      const current_stock = previous_stock + quantityChange;

      // 3. Update product stock
      transaction.update(productRef, { stock_quantity: current_stock });

      // 4. Record movement
      const movementRef = doc(collection(db, "inventory_movements"));
      const movement: any = cleanObject({
        ...data,
        previous_stock,
        current_stock,
        user_id: user.id,
        user_name: user.full_name || user.email || "Sistema",
        timestamp: serverTimestamp()
      });

      transaction.set(movementRef, movement);
      return { id: movementRef.id, ...movement };
    });
  },

  async processSale(saleData: any, items: any[], userContext?: any) {
    const user = userContext || api.getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado");

    return runTransaction(db, async (transaction) => {
      // 1. Get company settings
      const companyRef = doc(db, "companies", user.company_id);
      const companyDoc = await transaction.get(companyRef);
      const companyData = companyDoc.data() || {};
      const allowNegativeStock = companyData.allow_negative_stock === "true" || companyData.allow_negative_stock === true;

      // 2. Read all products and components FIRST
      const productDocs = new Map();
      const componentDocs = new Map();

      for (const item of items) {
        if (!productDocs.has(item.id)) {
          const productRef = doc(db, "products", item.id);
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) throw new Error(`Produto ${item.name} não encontrado`);
          productDocs.set(item.id, productDoc);

          const productData = productDoc.data();
          if (productData.bom_items && productData.bom_items.length > 0) {
            for (const bomItem of productData.bom_items) {
              if (!componentDocs.has(bomItem.product_id)) {
                const componentRef = doc(db, "products", bomItem.product_id);
                const componentDoc = await transaction.get(componentRef);
                if (!componentDoc.exists()) {
                  throw new Error(`Componente ${bomItem.product_name} do kit ${item.name} não encontrado`);
                }
                componentDocs.set(bomItem.product_id, componentDoc);
              }
            }
          }
        }
      }

      // 3. Validate and perform writes
      const stockUpdates = new Map(); // Track stock in memory to handle duplicate items

      for (const item of items) {
        const productDoc = productDocs.get(item.id);
        const productData = productDoc.data();
        
        if (productData.bom_items && productData.bom_items.length > 0) {
          for (const bomItem of productData.bom_items) {
            const componentDoc = componentDocs.get(bomItem.product_id);
            const componentData = componentDoc.data();
            
            const compPrevStock = stockUpdates.has(bomItem.product_id) 
              ? stockUpdates.get(bomItem.product_id) 
              : (componentData.stock_quantity || 0);
              
            const totalCompQty = bomItem.quantity * item.quantity;
            
            if (!allowNegativeStock && compPrevStock < totalCompQty) {
              throw new Error(`Estoque insuficiente para o componente ${bomItem.product_name} do kit ${item.name}. Disponível: ${compPrevStock}`);
            }
            
            const compCurrentStock = compPrevStock - totalCompQty;
            stockUpdates.set(bomItem.product_id, compCurrentStock);
            
            const componentRef = doc(db, "products", bomItem.product_id);
            transaction.update(componentRef, { stock_quantity: compCurrentStock });
            
            // Record movement for component
            const compMovementRef = doc(collection(db, "inventory_movements"));
            transaction.set(compMovementRef, {
              product_id: bomItem.product_id,
              product_name: bomItem.product_name,
              company_id: user.company_id,
              type: 'OUT',
              reason: 'SALE_KIT_COMPONENT',
              quantity: totalCompQty,
              previous_stock: compPrevStock,
              current_stock: compCurrentStock,
              reference_id: item.id, // Reference to the kit product
              user_id: user.id,
              user_name: user.full_name || user.email || "Sistema",
              timestamp: serverTimestamp()
            });
          }
        } else {
          // Standard product stock deduction
          const previous_stock = stockUpdates.has(item.id)
            ? stockUpdates.get(item.id)
            : (productData.stock_quantity || 0);

          if (!allowNegativeStock && previous_stock < item.quantity) {
            throw new Error(`Estoque insuficiente para o produto ${item.name}. Disponível: ${previous_stock}`);
          }

          const current_stock = previous_stock - item.quantity;
          stockUpdates.set(item.id, current_stock);

          const productRef = doc(db, "products", item.id);
          transaction.update(productRef, { stock_quantity: current_stock });

          // Record movement
          const movementRef = doc(collection(db, "inventory_movements"));
          const movement: any = {
            product_id: item.id,
            product_name: item.name,
            company_id: user.company_id,
            type: 'OUT',
            reason: 'SALE',
            quantity: item.quantity,
            previous_stock,
            current_stock,
            user_id: user.id,
            user_name: user.full_name || user.email || "Sistema",
            timestamp: serverTimestamp()
          };
          transaction.set(movementRef, movement);
        }
      }

      // 4. Create sale record
      const saleRef = doc(collection(db, "sales"));
      const finalSaleData = cleanObject({
        ...saleData,
        created_at: serverTimestamp()
      });
      transaction.set(saleRef, finalSaleData);

      // 5. Create financial record if "A Prazo" or "Fiado"
      if (saleData.payment_method === "A Prazo" || saleData.payment_method === "Fiado") {
        const receivableRef = doc(collection(db, "accountsReceivable"));
        transaction.set(receivableRef, {
          company_id: user.company_id,
          client_id: saleData.client_id,
          client_name: saleData.client_name,
          sale_id: saleRef.id,
          description: `Venda #${saleRef.id.substr(0, 8).toUpperCase()}`,
          amount: saleData.total,
          due_date: saleData.due_date || new Date().toISOString(),
          status: "Pendente",
          created_at: serverTimestamp()
        });
      }

      return { id: saleRef.id, ...finalSaleData };
    });
  },

  async processPurchase(purchaseData: any, items: any[], userContext?: any) {
    const user = userContext || api.getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado");

    return runTransaction(db, async (transaction) => {
      // 1. Read all products FIRST
      const productDocs = new Map();
      for (const item of items) {
        if (!productDocs.has(item.id)) {
          const productRef = doc(db, "products", item.id);
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) throw new Error(`Produto ${item.name} não encontrado`);
          productDocs.set(item.id, productDoc);
        }
      }

      // 2. Perform writes
      const stockUpdates = new Map();

      for (const item of items) {
        const productDoc = productDocs.get(item.id);
        const productData = productDoc.data();
        
        const previous_stock = stockUpdates.has(item.id)
          ? stockUpdates.get(item.id)
          : (productData.stock_quantity || 0);
          
        const current_stock = previous_stock + item.quantity;
        stockUpdates.set(item.id, current_stock);

        const productRef = doc(db, "products", item.id);
        transaction.update(productRef, { stock_quantity: current_stock });

        // Record movement
        const movementRef = doc(collection(db, "inventory_movements"));
        const movement: any = {
          product_id: item.id,
          product_name: item.name,
          company_id: user.company_id,
          type: 'IN',
          reason: 'PURCHASE',
          quantity: item.quantity,
          previous_stock,
          current_stock,
          user_id: user.id,
          user_name: user.full_name || user.email || "Sistema",
          timestamp: serverTimestamp()
        };
        transaction.set(movementRef, movement);
      }

      // 3. Create purchase record
      const purchaseRef = doc(collection(db, "purchases"));
      const finalPurchaseData = cleanObject({
        ...purchaseData,
        created_at: serverTimestamp()
      });
      transaction.set(purchaseRef, finalPurchaseData);

      // 4. Create financial record if "Pendente"
      if (purchaseData.payment_status === "Pendente") {
        const payableRef = doc(collection(db, "accountsPayable"));
        transaction.set(payableRef, {
          company_id: user.company_id,
          supplier_id: purchaseData.supplier_id,
          supplier_name: purchaseData.supplier_name,
          purchase_id: purchaseRef.id,
          description: `Compra #${purchaseRef.id.substr(0, 8).toUpperCase()}`,
          amount: purchaseData.total,
          due_date: purchaseData.due_date || new Date().toISOString(),
          status: "Pendente",
          created_at: serverTimestamp()
        });
      }

      return { id: purchaseRef.id, ...finalPurchaseData };
    });
  }
};
