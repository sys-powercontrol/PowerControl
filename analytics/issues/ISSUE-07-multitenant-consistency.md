# ISSUE-07: Consistência Multi-Tenant em Serviços e Vendedores — [CONCLUÍDO]

**Data e Hora de Geração:** 03 de Setembro de 2026 às 10:40:18 (Horário de Brasília - UTC-3)  
**Data de Conclusão:** 03 de Setembro de 2026 às 10:50:35 (Horário de Brasília - UTC-3)  
**Módulo:** Governança Multi-Tenant  
**Prioridade:** Alta  
**Status:** **[CONCLUÍDO]**

---

## 1. Contexto & Diagnóstico
- Em `Services.tsx` e `Sellers.tsx`, os formulários gravavam `company_id: user?.company_id`.
- Em contas com múltiplos CNPJs/filiais onde o usuário alterna a empresa ativa via seletor global (`currentCompanyId`), novos registros eram vinculados incorretamente à empresa matriz do usuário e não à empresa atualmente selecionada.

---

## 2. Escopo da Finalização Executado
- **Em `src/pages/Services.tsx` e `src/pages/Sellers.tsx`:**
  - [x] Utilizada a empresa ativa `currentCompanyId = api.getCompanyId() || user?.company_id` nas mutações de criação e edição.

---

## 3. Critérios de Aceite Verificados
- [x] Novos serviços e vendedores são vinculados à empresa selecionada no cabeçalho global, assegurando o isolamento multi-tenant correto entre matriz e filiais.
