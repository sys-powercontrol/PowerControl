# Especificação Técnica de Finalizações do Sistema (Spec)
**Data e Hora de Geração:** 26/08/2026 às 10:10:51 (Horário de Brasília - UTC-3)  
**Base de Referência:** `analytics/report.md`  
**Escopo:** Especificação técnica detalhada por Página, Componente e Comportamento exclusivamente para os itens de finalização identificados no diagnóstico, sem adicionar novas ferramentas.

---

## 1. Módulo de Estoque e Armazenagem Física

### 1.1. Catálogo e Listagem de Produtos
* **Página:** `src/pages/Products.tsx`
* **Componentes:** Barra de Filtros, Tabela de Produtos, Grade de Cards e `ProductDetailsModal.tsx`
* **Comportamentos:**
  * **Busca Abrangente por Localização:** O filtro textual deve verificar `name`, `sku`, `barcode`, `storage_location`, `storage_room`, `storage_rack` e `storage_shelf`.
  * **Filtro de Status de Endereçamento:** Adicionar opções no dropdown de filtros para:
    * `all`: Todos os produtos;
    * `hasLocation`: Somente produtos com localização cadastrada (`storage_location` preenchido);
    * `noLocation`: Somente produtos sem endereço cadastrado.
  * **Ordenação por Endereço Físico:** Incluir no seletor de ordenação a opção `"Endereço Físico (A-Z)"`, ordenando os registros alfabeticamente pela localização tanto no modo Tabela quanto no modo Grade.

### 1.2. Ajustes de Estoque e Transferências
* **Página:** `src/pages/InventoryAdjustments.tsx`
* **Componentes:** Formulário de Ajuste Simples, Modal de Transferência e `StockMapPowerBI.tsx`
* **Comportamentos:**
  * **Card de Conferência Física:** Ao selecionar um produto para ajuste manual ou transferência, exibir um card de contexto contendo:
    * Nome, SKU e Código de Barras;
    * Estoque Atual e Estoque Mínimo;
    * Endereço físico consolidado (`storage_location`) com destaque visual.
  * **Integração com o Mapa de Estoque:** Ao clicar no botão de ajuste rápido a partir de uma posição no `StockMapPowerBI.tsx`, navegar automaticamente para a aba de ajuste com o produto já selecionado.

### 1.3. Kardex e Histórico de Movimentações
* **Página:** `src/pages/InventoryHistory.tsx`
* **Componentes:** Tabela de Histórico e `ExportButton.tsx`
* **Comportamentos:**
  * **Exibição da Localização:** Incluir a coluna "Localização" nas tabelas de movimentações de estoque (entradas, saídas, ajustes e transferências).
  * **Exportação Completa:** Garantir que as exportações em PDF e Excel geradas pelo `ExportButton.tsx` incluam a coluna de localização física.

---

## 2. Módulo de Vendas, Checkout e PDV

### 2.1. Frente de Caixa (PDV) e Expedição
* **Página:** `src/pages/Sales.tsx`
* **Componentes:** Catálogo de Produtos, Lista do Carrinho e Utilitários de Impressão (`src/lib/utils/print.ts`)
* **Comportamentos:**
  * **Badge de Localização no Carrinho:** Cada item adicionado ao carrinho de vendas deve exibir um badge discreto com sua localização física para apoiar o operador na conferência.
  * **Orçamento A4 com Localização:** O layout de impressão do Orçamento A4 (`printA4Quote`) deve conter a coluna de localização do produto para agilizar o picking de expedição.
  * **Baixa de Pagamento Misto (Split):** Garantir a baixa correta das frações do pagamento misto, lançando valores em dinheiro no caixa ativo (`cashier_id`) e valores em cartão/PIX na conta bancária selecionada (`bank_account_id`).

### 2.2. Histórico de Vendas e Estorno de Comissões
* **Página:** `src/pages/SalesHistory.tsx` e `src/pages/CommissionPayouts.tsx`
* **Componentes:** Ação de Cancelamento de Venda e Gestão de Comissões
* **Comportamentos:**
  * **Cancelamento com Estorno de Comissão:** Ao cancelar uma venda que possua comissão vinculada a um vendedor, atualizar o status da comissão para cancelada/estornada, recalculando o saldo a pagar do vendedor.

---

## 3. Módulo de Impressão de Etiquetas

### 3.1. Emissor de Etiquetas de Código de Barras e Gôndola
* **Componente/Página:** `src/components/LabelPrinter.tsx`
* **Comportamentos:**
  * **Opção de Exibição de Localização:** Incluir checkbox para alternar a exibição da linha de localização física (`storage_location`) nos modelos de etiquetas (Térmica 80x40, Pimenta 6180 e Avery 5160).
  * **Ordenação Pré-Impressão por Corredor:** Permitir ordenar os produtos da fila de impressão pelo código de armazenagem antes de compilar o arquivo PDF.

---

## 4. Módulo de Compras e Importação de XML

### 4.1. Importador de NF-e
* **Página:** `src/pages/Purchases.tsx`
* **Componentes:** `src/components/Purchases/NFeXMLImporter.tsx` e `src/pages/AccountsPayable.tsx`
* **Comportamentos:**
  * **Preservação e Atribuição de Endereço:** Ao processar os itens da NF-e, se o produto já existir no cadastro, exibir sua localização atual; se for cadastrado como novo, permitir definir a localização inicial de armazenagem.
  * **Geração Automática de Contas a Pagar:** Extrair as tags de duplicatas (`<dup>`) da NF-e e gerar automaticamente os títulos correspondentes no `accounts_payable`, com seus respectivos números, parcelas, datas de vencimento e valores.

---

## 5. Módulo Financeiro, Caixa e Conciliação

### 5.1. Conciliador OFX e Fechamento de Turno de Caixa
* **Páginas:** `src/pages/BankReconciliation.tsx` e `src/pages/Cashiers.tsx`
* **Componentes:** `src/components/Financial/OFXImporter.tsx` e Modal de Fechamento de Caixa
* **Comportamentos:**
  * **Conciliação Automática OFX:** Ao importar arquivo `.ofx`, efetuar o cruzamento automático dos lançamentos com os títulos em aberto de `accounts_payable` e `accounts_receivable` por valor e data aproximada, oferecendo botão de conciliação rápida em 1 clique.
  * **Auditoria de Fechamento de Caixa:** No encerramento do caixa em `Cashiers.tsx`, calcular e comparar o saldo esperado com o valor físico em gaveta informado pelo operador, registrando sobras, faltas e justificativas de auditoria.

---

## 6. Módulo Fiscal e Certificados

### 6.1. Monitoramento Fiscal e Inutilização
* **Páginas:** `src/pages/Fiscal.tsx` e `src/pages/CertificateManager.tsx`
* **Componentes:** Banner de Alerta Fiscal, `src/components/Fiscal/InutilizacaoModal.tsx` e Ações da Tabela Fiscal
* **Comportamentos:**
  * **Alerta de Expiração de Certificado:** Exibir banner de advertência no painel fiscal quando o certificado digital A1 estiver expirado ou a menos de 30 dias do vencimento, com atalho direto para atualização.
  * **Validação de Inutilização SEFAZ:** Exigir justificativa com no mínimo 15 caracteres no `InutilizacaoModal.tsx` antes do envio da solicitação à SEFAZ.
  * **Reenvio de DANFE/XML:** Conectar o botão de reenvio de e-mail na listagem fiscal para acionar a rota de envio com o destinatário informado.

---

## 7. Módulo Offline e Resiliência PWA

### 7.1. Sincronização e Fila Local
* **Componentes/Services:** `src/lib/offlineStore.ts`, `src/components/OfflineSyncStatusBar.tsx` e `src/sw.ts`
* **Comportamentos:**
  * **Drenagem Resiliente da Fila:** Garantir o envio automático em lote e a limpeza das operações pendentes do IndexedDB quando a conexão for restabelecida.
  * **Barra de Conectividade:** Atualizar em tempo real o contador de registros pendentes na `OfflineSyncStatusBar.tsx`.
