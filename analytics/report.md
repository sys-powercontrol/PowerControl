# Relatório de Análise Geral do Sistema — Pendências de Finalização

**Data e Hora de Geração:** 29 de Agosto de 2026 às 20:45:49 (Horário de Brasília - UTC-3)  
**Objetivo:** Mapeamento estrito das finalizações e amarrações de consistência pendentes no sistema, **sem inclusão de novas funcionalidades ou escopos não solicitados**.

---

## 1. Sumário Executivo

A auditoria arquitetural do sistema verificou a maturidade dos módulos de Vendas/PDV, Financeiro, Fiscal, Estoque, Pessoas e Governança. O sistema possui arquitetura sólida, rotas bem definidas e integração com banco de dados em nuvem. 

A presente análise identifica exclusivamente **pontos de finalização e consistência operacional** que garantem que todos os ciclos de vida de dados (compras, fechamentos de caixa, cadastros de clientes e impressões fiscais) encerrem sem pontas soltas ou divergências contábeis.

---

## 2. Levantamento das Finalizações Pendentes

### 2.1 Módulo de Compras & Reversão de Estoque (`PurchaseHistory.tsx` & `inventory.ts`)
- **Situação Atual:** No cancelamento e exclusão de compras em `PurchaseHistory.tsx`, o sistema executa o estorno financeiro (`reversePurchasePayment`), porém o estoque recebido não é estornado proporcionalmente (`inventory.reversePurchaseStock`), gerando potencial saldo fantasma no inventário.
- **Finalização Necessária:**
  - Implementar o método `reversePurchaseStock(purchase)` em `src/lib/inventory.ts` e acioná-lo durante o cancelamento e exclusão de compras.
  - Atualizar o status das contas a pagar atreladas à compra para `"Cancelado"`.

### 2.2 Módulo de Caixa e Fechamento de Ciclo (`Cashiers.tsx`)
- **Situação Atual:** No fechamento de caixa com diferença entre o saldo apurado pelo sistema e o saldo contado pelo operador (`counted !== expected`), o valor da diferença é salvo no registro do caixa, mas não gera lançamento de acerto contábil no extrato/fluxo de caixa. Além disso, a visualização do histórico de ciclos anteriores precisa de listagem refinada.
- **Finalização Necessária:**
  - Registrar lançamento automático de movimentação (`movements`) para quebra de caixa (despesa) ou sobra de caixa (receita extraordinária) quando houver diferença apurada.
  - Exibir no modal de histórico de fechamentos a relação auditada dos turnos anteriores com operador, valores e status.

### 2.3 Módulo de Clientes & Consulta CNPJ (`Clients.tsx`)
- **Situação Atual:** Em `Suppliers.tsx` já existe a busca por CNPJ via `externalApi.fetchCNPJ`, enquanto em `Clients.tsx` o usuário PJ precisa preencher Razão Social, Fantasia e Endereço manualmente caso digite um CNPJ.
- **Finalização Necessária:**
  - Conectar a busca por CNPJ em `Clients.tsx` para autopreenchimento dos dados empresariais e endereço quando informado um CNPJ válido de 14 dígitos.

### 2.4 Módulo Fiscal & Visualização de DANFE NFC-e (`DanfeViewer.tsx`)
- **Situação Atual:** O visualizador de DANFE está estruturado primariamente para PDF/iframe em formato NF-e A4. Notas do modelo NFC-e (modelo 65 - PDV) requerem formatação e opção de impressão em cupom térmico (80mm/58mm).
- **Finalização Necessária:**
  - Adicionar suporte a renderização e impressão em modo cupom fiscal térmico no `DanfeViewer.tsx` quando a nota for do tipo NFC-e.

---

## 3. Matriz de Prioridade Técnica

| Prioridade | Módulo | Item | Impacto |
| :--- | :--- | :--- | :--- |
| **Alta** | Compras / Estoque | Reversão de estoque no cancelamento de compras | Evita divergência de estoque físico e fiscal |
| **Alta** | Caixa / Financeiro | Lançamento de ajuste para quebra/sobra de caixa | Garante conciliação precisa do saldo em caixa |
| **Média** | Clientes | Busca e autopreenchimento de CNPJ | Agilidade operacional no cadastro de clientes PJ |
| **Média** | Fiscal | Visualização e impressão térmica de NFC-e | Conformidade no atendimento PDV |

---

## 4. Próximos Passos

1. Estruturação do documento de especificação técnica em `/analytics/Spec.md`.
2. Desmembramento em issues atômicas na pasta `/analytics/issues/`.
3. Elaboração do plano de execução detalhado em `/analytics/issues/plan.md`.
