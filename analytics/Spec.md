# Especificação Técnica de Finalizações do Sistema (/spec)
**Data e Hora de Geração:** 27/08/2026 às 11:10:45 (Horário de Brasília - UTC-3)  
**Diretriz Estrita:** Especificação técnica focada exclusivamente nas finalizações pendentes mapeadas no `analytics/report.md`. Proibida a especificação ou implementação de funcionalidades novas ou fora do escopo pré-existente.

---

## 1. Módulo de Produtos, Estoque e Armazenagem Física

### 1.1. Busca e Filtro Unificado por Endereçamento Físico
* **Page / View:** `src/pages/Products.tsx`
* **Components Afetados:** Componente de busca (`SearchInput`), barra de filtros e seletor de ordenação.
* **Comportamento Esperado (Behavior):**
  * **Busca:** O termo digitado na barra de pesquisa deve verificar: `name`, `sku`, `barcode`, `storage_location`, `storage_room`, `storage_rack` e `storage_shelf`.
  * **Filtros Rápidos:** Adicionar chip/filtro para selecionar "Com Localização Cadastrada" e "Sem Localização Cadastrada".
  * **Ordenação:** Incluir opção no menu de ordenação: "Endereço de Estoque (A-Z)".

### 1.2. Conferência de Localização nos Ajustes de Estoque
* **Page / View:** `src/pages/InventoryAdjustments.tsx`
* **Components Afetados:** Formulário de ajuste simples, transferência entre empresas e integração com `StockMapPowerBI.tsx`.
* **Comportamento Esperado (Behavior):**
  * Ao selecionar o produto no `<select>` ou via busca, renderizar um card de conferência de picking exibindo: `Sala`, `Armário/Estante`, `Gaveta/Prateleira` e `Código Composto`.
  * Ao navegar do mapa (`StockMapPowerBI.tsx`) para a tela de ajustes via atalho, a URL deve receber o parâmetro `?productId=...` e pré-selecionar o produto automaticamente.

### 1.3. Localização Física no Histórico e Relatórios Kardex
* **Page / View:** `src/pages/InventoryHistory.tsx`
* **Components Afetados:** Tabela de movimentações de estoque e botões de exportação (`ExportButton`).
* **Comportamento Esperado (Behavior):**
  * Exibir a coluna `Localização` na tabela de movimentações de estoque.
  * Incluir o campo `storage_location` no cabeçalho dos arquivos exportados em XLSX e PDF.

---

## 2. Módulo de Vendas, Checkout e PDV

### 2.1. Exibição de Localização Física para Picking no Orçamento A4
* **Page / View:** `src/pages/Sales.tsx`, `src/pages/SalesHistory.tsx`
* **Components / Utilities Afetados:** `src/lib/utils/print.ts` (`printA4Quote`), modal de recibo/orçamento.
* **Comportamento Esperado (Behavior):**
  * Na impressão do Orçamento / Pedido de Separação em formato A4 (`printA4Quote`), incluir uma coluna ou badge abaixo do nome do produto com o endereço físico (`Localização: A1-E02/P03`).

### 2.2. Liquidação Segregada em Pagamentos Mistos (Split)
* **Page / View:** `src/pages/Sales.tsx`
* **Components Afetados:** Modal de finalização de venda e mutação de registro no financeiro.
* **Comportamento Esperado (Behavior):**
  * Quando a venda utilizar múltiplos métodos de pagamento (ex: R$ 50 em Dinheiro e R$ 100 no Cartão de Crédito):
    * O valor em dinheiro deve ser lançado como entrada no Caixa físico ativo do operador (`cashiers`).
    * O valor em cartão/PIX deve ser registrado diretamente na Conta Bancária configurada (`bankAccounts`) e/ou gerado título a receber correspondente.

### 2.3. Estorno Automático de Comissões no Cancelamento de Vendas
* **Page / View:** `src/pages/SalesHistory.tsx`
* **Components Afetados:** Ação de cancelamento de venda (`handleCancelSale`) e integração com `CommissionPayouts.tsx`.
* **Comportamento Esperado (Behavior):**
  * Ao cancelar uma venda que possua comissão com status `pending`, o status da comissão deve ser atualizado para `canceled`.
  * Registrar evento de auditoria (`audit_logs`) informando o cancelamento da venda e o estorno da comissão do vendedor.

---

## 3. Módulo de Compras e Importação de XML NF-e

### 3.1. Vínculo de Endereço Físico na Entrada de Produtos
* **Page / View:** `src/pages/Purchases.tsx`, `src/components/Purchases/NFeXMLImporter.tsx`
* **Components Afetados:** Modal de importação e mapeamento de itens do XML.
* **Comportamento Esperado (Behavior):**
  * Para itens associados a produtos existentes, manter o endereço atual do estoque.
  * Para itens novos que serão cadastrados pelo XML, permitir preencher o endereço físico inicial (`storage_location` ou Sala/Armário/Gaveta) no grid de conferência do XML antes de salvar.

### 3.2. Integração Automática de Duplicatas com o Contas a Pagar
* **Page / View:** `src/components/Purchases/NFeXMLImporter.tsx`, `src/pages/AccountsPayable.tsx`
* **Components Afetados:** Processamento das tags `<cobr><dup>` do XML.
* **Comportamento Esperado (Behavior):**
  * Ao confirmar a importação do XML que contenha cobrança/duplicatas, criar automaticamente as parcelas correspondentes na coleção `accountsPayable`, preenchendo fornecedor, número da fatura/duplicata, data de vencimento e valor.

---

## 4. Módulo Financeiro, Caixa e Conciliação Bancária

### 4.1. Conciliação Automática de Títulos via Extrato OFX
* **Page / View:** `src/pages/BankReconciliation.tsx`, `src/components/Financial/OFXImporter.tsx`
* **Components Afetados:** Modal do leitor OFX e listagem de correspondências sugeridas.
* **Comportamento Esperado (Behavior):**
  * O parser OFX deve comparar os débitos/créditos do extrato bancário com as contas a pagar/receber em aberto da empresa.
  * Lançamentos com valor exato e vencimento dentro de uma janela de ±3 dias devem ser marcados com sugestão verde de match.
  * O botão "Conciliar Selecionados" deve efetuar a baixa das contas com a data e conta bancária do extrato.

### 4.2. Auditoria e Conferência no Fechamento de Caixa
* **Page / View:** `src/pages/Cashiers.tsx`
* **Components Afetados:** Modal de encerramento/fechamento de turno de caixa.
* **Comportamento Esperado (Behavior):**
  * No fechamento de caixa, o operador digita os valores físicos contados por forma de pagamento (Dinheiro, Cartão, PIX, etc.).
  * O sistema calcula a diferença (`Diferença = Valor Informado - Saldo Calculado do Sistema`).
  * Em caso de quebra ou sobra de caixa, exigir preenchimento de campo de justificativa e salvar os metadados de conferência no documento do caixa.

---

## 5. Módulo Fiscal e Certificados Digitais

### 5.1. Banner de Alerta de Expiração de Certificado Digital A1
* **Page / View:** `src/pages/CertificateManager.tsx`, `src/pages/Fiscal.tsx`
* **Components Afetados:** Header / Top Banner das páginas fiscais.
* **Comportamento Esperado (Behavior):**
  * Se o certificado ativo estiver a 30 dias ou menos do vencimento, exibir banner de aviso com contagem regressiva em dias e botão direto para renovação/upload.
  * Se o certificado já estiver expirado, exibir alerta crítico vermelho impedindo tentativas de transmissão à SEFAZ.

### 5.2. Validação Estrita de Justificativa na Inutilização de Faixa
* **Page / View:** `src/components/Fiscal/InutilizacaoModal.tsx`
* **Components Afetados:** Formulário de inutilização de numeração SEFAZ.
* **Comportamento Esperado (Behavior):**
  * Validar em tempo real se o campo "Motivo da Inutilização" possui no mínimo 15 caracteres (conforme Manual de Orientação do Contribuinte da SEFAZ).
  * Exibir contador de caracteres `(X/15)` e bloquear o botão de envio caso o limite mínimo não seja atingido.

### 5.3. Reenvio de DANFE / XML por E-mail
* **Page / View:** `src/pages/Fiscal.tsx`
* **Components Afetados:** Menu de ações de cada nota fiscal autorizada.
* **Comportamento Esperado (Behavior):**
  * Adicionar ação "Reenviar por E-mail" na linha da NF-e autorizada.
  * Ao clicar, abrir modal simples confirmando o e-mail do destinatário e disparar o envio com anexo do XML e DANFE PDF.

---

## 6. Módulo de Impressão de Etiquetas Térmicas e A4

### 6.1. Exibição de Endereço Físico e Ordenação na Emissão de Etiquetas
* **Page / View:** `src/components/LabelPrinter.tsx`
* **Components Afetados:** Opções de customização da etiqueta e motor de renderização do PDF.
* **Comportamento Esperado (Behavior):**
  * Adicionar checkbox "Incluir Endereço de Estoque na Etiqueta" nas opções de configuração do layout.
  * Permitir ordenar a fila de impressão selecionada por "Endereço de Estoque (Ordem Física de Separação)".

---

## 7. Módulo de Sincronização Offline e PWA

### 7.1. Drenagem Resiliente da Fila Offline e Atualização de Status
* **Page / View:** `src/lib/offlineStore.ts`, `src/components/OfflineSyncStatusBar.tsx`
* **Components Afetados:** Gerenciador de eventos online/offline e componente de barra de status fixo.
* **Comportamento Esperado (Behavior):**
  * Ao detectar a reconexão (`window.addEventListener('online')`), iniciar a sincronização sequencial das operações pendentes do IndexedDB.
  * Em caso de falha de conexão no meio da drenagem, manter a transação não sincronizada na fila e exibir notificação amigável com botão "Tentar Sincronizar Agora".
