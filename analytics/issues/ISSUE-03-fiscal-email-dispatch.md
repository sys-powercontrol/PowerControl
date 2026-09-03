# ISSUE-03: Disparo HTTP de E-mail de Nota Fiscal — [CONCLUÍDO]

**Data e Hora de Geração:** 03 de Setembro de 2026 às 10:40:18 (Horário de Brasília - UTC-3)  
**Data de Conclusão:** 03 de Setembro de 2026 às 10:50:35 (Horário de Brasília - UTC-3)  
**Módulo:** Fiscal / Backend  
**Prioridade:** Baixa  
**Status:** **[CONCLUÍDO]**

---

## 1. Contexto & Diagnóstico
- No modal de envio de e-mail de `Fiscal.tsx`, o manipulador disparava `api.post("fiscal/send-email", ...)`, tentando gravar um documento no Firestore.
- O servidor Express dispõe do endpoint `/api/fiscal/send-email` pronto para processar o envio via serviço de e-mail.

---

## 2. Escopo da Finalização Executado
- **Em `src/pages/Fiscal.tsx`:**
  - [x] Chamada conectada à rota HTTP Express:
    ```typescript
    const response = await fetch("/api/fiscal/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoice_id: emailInvoice.id,
        recipient_email: recipientEmail,
        company_id: currentCompanyId
      })
    });
    ```
  - [x] Tratada a resposta e exibido feedback via Sonner toast.
- **No Backend Express (`src/serverApp.ts`):**
  - [x] Rota `/api/fiscal/send-email` validando os parâmetros recebidos (`invoice_id`, `recipient_email`), consultando a nota fiscal e respondendo com `{ status: "ok", success: true, message: "..." }`.

---

## 3. Critérios de Aceite Verificados
- [x] O envio de e-mail pelo modal fiscal aciona a rota Express `/api/fiscal/send-email` e apresenta toast de confirmação.
