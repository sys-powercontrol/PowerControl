# Issue 02 - Finalização do Módulo Financeiro, Fluxo de Caixa e Conciliação Bancária

**Data e Hora de Geração:** 28 de Agosto de 2026 às 15:36:44 (Horário de Brasília - UTC-3)  
**Módulo:** Financeiro & Conciliação Bancária  
**Documento de Origem:** `analytics/Spec.md` - Seção 2.2  
**Criticidade:** Alta  

---

## 1. Descrição do Problema
O sistema possui módulos de Contas a Pagar/Receber, extrato bancário, sessões de caixa (PDV) e importação de extratos OFX. Para garantir a integridade dos saldos financeiros, é necessário fechar o ciclo de estornos com recomposição atômica de contas e caixas, além de impedir duplicidades na conciliação de arquivos OFX.

---

## 2. Escopo de Finalização (Sem Novas Funcionalidades)

### 2.1. Estorno Transacional Atômico de Títulos Baixados
- **Arquivos:** `src/pages/AccountsReceivable.tsx`, `src/pages/AccountsPayable.tsx`, `src/lib/finance.ts`
- **Ação:**
  1. Ao estornar a baixa de um título pago/recebido, utilizar transação no Firestore (`runTransaction`).
  2. Reverter o status do título para `pendente`, zerando a data e o valor pago.
  3. Recompor o saldo da conta bancária (`bank_accounts`) com o débito ou crédito correspondente.
  4. Se o título tiver sido liquidado em sessão de caixa ativa (`cashiers`), deduzir ou ajustar o saldo do caixa.
  5. Gerar registro de movimentação de estorno para manter a trilha de auditoria do extrato financeiro.

### 2.2. Bloqueio de Exclusão Direta de Títulos Liquidados
- **Arquivos:** `src/pages/AccountsReceivable.tsx`, `src/pages/AccountsPayable.tsx`
- **Ação:**
  1. Travar a ação de exclusão definitiva em títulos que estejam com status `pago` ou `recebido`.
  2. Instruir o operador a realizar o estorno prévio da baixa antes de permitir a exclusão do registro.

### 2.3. Identificador Unívoco (`fitid`) na Importação OFX
- **Arquivos:** `src/components/Financial/OFXImporter.tsx`
- **Ação:**
  1. Extrair e gravar a tag `<FITID>` de cada lançamento contido no arquivo `.ofx` no documento `bank_transactions`.
  2. Na importação, validar se o `fitid` já existe na conta bancária para evitar inserção de lançamentos duplicados.

---

## 3. Critérios de Aceite
- [ ] O estorno de uma conta a receber recompõe o saldo da conta bancária e do caixa de forma atômica.
- [ ] Títulos pagos não podem ser excluídos diretamente sem estorno prévio.
- [ ] A reimportação de um extrato OFX com transações já conciliadas ignora lançamentos com `fitid` duplicado.
