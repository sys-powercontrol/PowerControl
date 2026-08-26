# Relatório de Diagnóstico e Finalizações do Sistema
**Data e Hora de Geração:** 26/08/2026 às 10:10:51 (Horário de Brasília - UTC-3)  
**Diretriz Estrita:** Análise diagnóstica exclusivamente das implementações existentes que demandam finalização, alinhamento ou estabilização. Proibida a inclusão ou criação de novas ferramentas, novas telas ou arquiteturas adicionais não existentes.

---

## 1. Sumário Executivo

O sistema **PowerControl ERP** apresenta uma arquitetura robusta e completa para gestão empresarial integrada, incluindo:
* **Estoque e Armazenagem Física:** Cadastro multinível de localização (Sala, Armário/Estante, Prateleira), Kardex e Mapa Visual de Estoque.
* **Vendas e PDV:** Frente de caixa com suporte a múltiplos métodos de pagamento (inclusive pagamento misto/split), controle de expedição e emissão de comprovantes/orçamentos.
* **Emissão de Etiquetas:** Geração de layouts térmicos (80x40) e folhas A4 (Pimenta 6180, Avery 5160) com código de barras e QR Code.
* **Compras e XML:** Importação automatizada de NF-e via XML com leitura de itens e duplicatas financeiras.
* **Financeiro e Caixa:** Contas a Pagar/Receber, conciliação de extratos bancários OFX e abertura/fechamento com auditoria de turnos de operadores de caixa.
* **Fiscal e Certificados:** Emissão de NF-e/NFC-e, gestão de certificado digital A1, controle de inutilização de numeração e contingência.
* **Operação Offline e PWA:** Armazenamento local no IndexedDB com fila de sincronização em segundo plano.

O objetivo deste relatório é registrar todas as amarrações pontuais, validações de consistência e detalhes de UX/integração que concluem o ciclo de vida de cada um dos módulos existentes, sem implementar novos módulos.

---

## 2. Diagnóstico Detalhado por Módulo

---

### 2.1. Módulo de Produtos, Estoque e Armazenagem Física
* **Arquivos do Módulo:** `src/pages/Products.tsx`, `src/pages/InventoryAdjustments.tsx`, `src/pages/InventoryHistory.tsx`, `src/components/Inventory/StockMapPowerBI.tsx`
* **Situação Atual:**
  * Estrutura de endereçamento físico (`storage_room`, `storage_rack`, `storage_shelf` e `storage_location`) consolidada no cadastro e modal de detalhes.
  * Mapa de estoque e relatórios de giro implementados.
* **Pontos de Finalização Existentes:**
  1. **Busca e Filtro em Produtos (`Products.tsx`):** A busca unificada por texto deve cobrir tanto nome/SKU/código de barras quanto todos os campos de localização física (`storage_location`, `storage_room`, `storage_rack`, `storage_shelf`), além de permitir filtrar por "Com Localização" ou "Sem Localização" e ordenar alfabeticamente por endereço físico nas visualizações em grade e tabela.
  2. **Conferência Física nos Ajustes (`InventoryAdjustments.tsx`):** Ao selecionar um item para ajuste manual ou transferência, disponibilizar o card de conferência física com a localização do produto. Ao acionar o atalho a partir do mapa visual (`StockMapPowerBI.tsx`), transicionar diretamente com o item pré-carregado.
  3. **Kardex e Rastreabilidade (`InventoryHistory.tsx`):** As tabelas de movimentações e os relatórios exportados (PDF/Excel) devem exibir a coluna de endereço físico do item.

---

### 2.2. Módulo de Vendas, Checkout e PDV
* **Arquivos do Módulo:** `src/pages/Sales.tsx`, `src/pages/SalesHistory.tsx`, `src/lib/utils/print.ts`, `src/pages/CommissionPayouts.tsx`
* **Situação Atual:**
  * Frente de caixa ágil com catálogo, carrinho, seleção de cliente/vendedor e suporte a pagamento misto (Split).
  * Impressão de cupom térmico e orçamentos em formato A4.
* **Pontos de Finalização Existentes:**
  1. **Picking e Separação no PDV (`Sales.tsx` e `print.ts`):** Exibição da identificação de localização física nos itens do carrinho e na emissão impressa do Orçamento A4 (`printA4Quote`), auxiliando a expedição no momento da separação.
  2. **Liquidação Multimeios (Split):** Garantir a baixa correta das frações de pagamento misto, roteando dinheiro para o caixa ativo e cartões/PIX para a conta bancária selecionada.
  3. **Estorno de Comissões (`SalesHistory.tsx`):** Ao realizar o cancelamento de uma venda no histórico, cancelar ou estornar automaticamente as comissões pendentes do vendedor correspondente.

---

### 2.3. Módulo de Impressão de Etiquetas
* **Arquivos do Módulo:** `src/components/LabelPrinter.tsx`
* **Situação Atual:**
  * Gerador de etiquetas em PDF com múltiplos padrões de layout (Pimenta 6180, Avery 5160 e Térmica 80x40).
* **Pontos de Finalização Existentes:**
  1. **Endereço Físico nas Etiquetas:** Opção configurável para incluir o código de localização (`storage_location`) no corpo das etiquetas impressas.
  2. **Ordenação por Corredor/Estante:** Ordenação da lista de etiquetas selecionadas de acordo com a sequência física de armazenagem antes da renderização do PDF.

---

### 2.4. Módulo de Compras e Importação de XML NF-e
* **Arquivos do Módulo:** `src/pages/Purchases.tsx`, `src/components/Purchases/NFeXMLImporter.tsx`, `src/pages/AccountsPayable.tsx`
* **Situação Atual:**
  * Importador de XML realiza o parse completo de dados de cabeçalho, fornecedor, itens e duplicatas.
* **Pontos de Finalização Existentes:**
  1. **Vínculo e Atribuição de Endereço:** Preservar a localização física cadastrada de produtos já existentes e permitir definir o endereço de estoque inicial de produtos novos criados a partir do XML.
  2. **Geração Automática do Contas a Pagar:** Conectar a leitura das duplicatas (`<dup>`) da NF-e para gerar os lançamentos financeiros no `AccountsPayable.tsx` com as respectivas datas de vencimento e valores.

---

### 2.5. Módulo Financeiro, Caixa e Conciliação Bancária
* **Arquivos do Módulo:** `src/pages/BankReconciliation.tsx`, `src/pages/Cashiers.tsx`, `src/components/Financial/OFXImporter.tsx`
* **Situação Atual:**
  * Módulo financeiro com gestão de contas a pagar/receber, caixas de operadores e extratos bancários com leitor OFX.
* **Pontos de Finalização Existentes:**
  1. **Conciliação Inteligente OFX (`OFXImporter.tsx`):** Cruzamento automático de lançamentos bancários com títulos a pagar e a receber com valores e datas coincidentes, permitindo conciliação e baixa em 1 clique.
  2. **Auditoria de Fechamento de Caixa (`Cashiers.tsx`):** Comparação entre o saldo esperado em sistema e o valor físico informado pelo operador na contagem de fechamento, registrando eventuais sobras ou faltas com notas explicativas de auditoria.

---

### 2.6. Módulo Fiscal e Certificados Digitais
* **Arquivos do Módulo:** `src/pages/Fiscal.tsx`, `src/pages/CertificateManager.tsx`, `src/components/Fiscal/InutilizacaoModal.tsx`
* **Situação Atual:**
  * Emissão, cancelamento e monitoramento de notas fiscais (NF-e/NFC-e), envio de XMLs e gestão do Certificado A1.
* **Pontos de Finalização Existentes:**
  1. **Alerta de Validade de Certificado:** Exibição de banner proativo de aviso quando a validade do certificado digital estiver com menos de 30 dias de expiração ou expirado.
  2. **Inutilização de Numeração SEFAZ (`InutilizacaoModal.tsx`):** Validação de justificativa com no mínimo 15 caracteres (exigência técnica da SEFAZ) e persistência do histórico de homologação.
  3. **Reenvio de Documentos Fiscais:** Acionamento do reenvio de DANFE/XML por e-mail diretamente a partir da lista de notas fiscais autorizadas.

---

### 2.7. Sincronização Offline e PWA
* **Arquivos do Módulo:** `src/lib/offlineStore.ts`, `src/components/OfflineSyncStatusBar.tsx`, `src/sw.ts`
* **Situação Atual:**
  * Estrutura de IndexedDB para contingência offline de vendas, clientes e movimentações de estoque.
* **Pontos de Finalização Existentes:**
  1. **Drenagem Resiliente da Fila Offline:** Processamento ordenado da fila de operações com tratamento de falhas, retries e atualização de estoque/financeiro ao reestabelecer conexão.
  2. **Monitoramento em Tempo Real:** Atualização dinâmica da barra de status (`OfflineSyncStatusBar.tsx`) refletindo a quantidade de transações pendentes de sincronização.

---

## 3. Matriz de Priorização para Execução

| ID | Módulo / Área | Escopo de Finalização | Criticidade |
| :---: | :--- | :--- | :---: |
| **FIN-01** | Estoque & Armazenagem | Busca unificada por endereço, card de conferência no ajuste e coluna no Kardex | Alta |
| **FIN-02** | Vendas & PDV | Picking no carrinho/orçamento, split payment e estorno de comissão | Alta |
| **FIN-03** | Impressão de Etiquetas | Localização nas etiquetas e ordenação prévia por corredor | Média |
| **FIN-04** | Compras & XML | Vínculo de estoque e geração de títulos a pagar das duplicatas | Alta |
| **FIN-05** | Financeiro & Caixa | Conciliação inteligente OFX e conferência física no fechamento de caixa | Alta |
| **FIN-06** | Fiscal & Certificados | Alerta de expiração do A1, validação de inutilização e reenvio de XML | Alta |
| **FIN-07** | Offline & Resiliência | Drenagem automática da fila e indicador visual de conectividade | Média |

---
*Relatório de diagnóstico gerado com foco estrito na finalização e consistência dos módulos do sistema.*
