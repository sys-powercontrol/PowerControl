# Relatório de Diagnóstico e Erros do Sistema

**Data da Análise:** 16 de Abril de 2026
**Objetivo:** Varredura detalhada e estática do código para levantamento de falhas lógicas, bugs de segurança e problemas de persistência. Nenhuma modificação foi realizada no código.

---

## 1. Vulnerabilidade Crítica de Segurança: Isolamento de Dados Temporário
* **Local:** `src/lib/api.ts` (linhas 113 e 187)
* **Descrição da Falha:** Nas funções `api.get` e `api.subscribe`, a injeção do filtro que protege e isola as tabelas baseadas por empresa está condicionado de forma incorreta:
  ```ts
  if (!isSystemAdminStatus && currentCompanyId && !isCompanyEntity) {
      conditions.push(where("company_id", "==", currentCompanyId));
  }
  ```
  Isso significa que, caso ocorra alguma dessincronização de estado persistente do usuário comum (onde `currentCompanyId` perde a referência momentânea e adquire valor `null` ou `undefined`), o código entende a cláusula como falsa e omite a busca estrita com `where`. O resultado disso é que a consulta vai ignorar restrições, expondo relatórios, produtos e vendas de *todas* as empresas locatárias ativas ao usuário afetado.

## 2. Erro de Regras de Negócio: Cálculo de Bases Fiscais e Descontos
* **Local:** `src/pages/Sales.tsx` (linhas 273 - 286)
* **Descrição da Falha:** A geração do valor final e tributário da venda está descompassada caso existam descontos. 
  A rotina itera sobre cada linha de item para aplicar tributos `fiscal.calculateTaxes(item.price * item.quantity)` no valor "bruto". Mais abaixo, a variável `totalFiscalValue` subtrai o desconto da soma desses itens para determinar a conta final financeira e calcular a comissão.
  O erro sistemático é que a dedução de desconto **nunca ocorreu nas bases de cálculos** (alíquotas ICMS, IPI, PIS/Cofins etc). Esses impostos ficam inflados artificialmente (usando a base bruta original).

## 3. Integridade do Contexto em Sincronização Offline Assíncrona
* **Local:** `src/lib/offlineStore.ts` (linha 77) vs `src/lib/inventory.ts` (linha 57)
* **Descrição da Falha:** Vendas finalizadas com a ausência de internet dependem que a função `inventory.processSale()` use o histórico em cache a partir do `Service Worker`. Contudo, ao repassar parâmetros a função `inventory.processSale(sale.saleData, sale.items, sale.userContext)` valida as regras de estoque e caixa lendo da variável atrelada ao logado do momento. Se a aplicação for deslogada ou sofrer troca de conta no modo offline, ou se o Service Worker for reativado sem contexto reativo da `api.ts`, ele poderá lançar produtos negando consistência, atribuindo estoques e operações ao `user_id` errado de maneira silenciosa.

## 4. Falha Silenciosa em Funções Essenciais (Missing Error Boundaries)
* **Locais (Grep Warnings):** 
  * `src/pages/Company.tsx` (Logo upload missing fail triggers).
  * `src/services/fiscalApi.ts` (Logging apenas console - SEFAZ/Webmania erros omitidos na tela).
  * `src/lib/firebase.ts` (Erro CRÍTICO caso a variável `firestoreDatabaseId` não exista interrompe todo o framework de banco com um console.error não manipulado em try/catch, travando a árvore do React (White Screen of Death)).
* **Descrição da Falha:** Os blocos `try/catch` implementados reportam os problemas logando cruamente atributos via `console.error()`, impedindo o usuário comum de reagir a erros como: notas fiscais rejeitadas pelo SEFAZ por falhas cadastrais de CEP/Documentos ou timeouts de pagamento no fechamento de conta.

## 5. UI/UX Congelamento em Múltiplos Checkouts e Promessas Órfãs
* **Local:** `src/components/Sales/PaymentGateway.tsx` e `Sales.tsx`
* **Descrição da Falha:** Em caso do Gateway de cartão ou simulações PIX gerarem exceções de tempo limite (timeout) com instabilidades (onde os métodos `onSuccess` ou `onClose` falhem ao emitir retorno de estado local), a mutação base desativa os botões globais (`Disabled`) causando congelamento das opções sem meio mecânico de reset do "Carrinho" ou estorno dos itens provisados, obrigando refrehs (`F5`) imediato e potencial perda de status na nuvem de caixa.
