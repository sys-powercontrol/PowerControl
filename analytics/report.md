# Relatório de Análise Geral do Sistema — Pendências de Finalização

**Data e Hora de Geração:** 03 de Setembro de 2026 às 10:00:00 (Horário de Brasília - UTC-3)  
**Objetivo:** Mapeamento consolidado das implementações e amarrações de consistência pendentes no sistema, **estritamente sem inclusão de novas funcionalidades ou escopos não solicitados**.

---

## 1. Sumário Executivo

A auditoria geral da aplicação avaliou os fluxos de ponta a ponta do ERP:
- **Navegação & Roteamento:** Consistência de rotas no `App.tsx` e menus no `Layout.tsx`.
- **Fiscal:** Ciclo de emissão de NF-e/NFC-e, gestão de certificado digital A1 (.pfx), cancelamento SEFAZ e envio de notas.
- **Financeiro & Caixas:** Abertura, fechamento e quebra de caixa, conciliação bancária OFX, pagamento de comissões em lote.
- **Vendas & Estoque:** Consistência de status em cancelamentos com notas vinculadas, histórico de estoque e integridade transacional.
- **Governança Multi-Tenant & Acessos:** Isolamento correto por `currentCompanyId` em cadastros, fluxo de convites com autenticação Google e gestão de colaboradores.
- **Configurações & Notificações:** Completude dos formulários existentes e persistência de alertas internos.

Foram identificadas **8 (oito) pendências técnicas de finalização** — componentes existentes com fluxos incompletos, rotas conflitantes/órfãs, mutações codificadas sem trigger na UI ou divergências de dados entre módulos.

---

## 2. Levantamento Detalhado das Finalizações Pendentes

### 2.1 Roteamento: Conflito de Rota `/Categorias` e Página Órfã de Auditoria
- **Arquivos:** `src/App.tsx` e `src/components/Layout.tsx`
- **Diagnóstico:**
  1. Em `src/App.tsx`, existem duas declarações da rota `/Categorias`:
     - Linha 129: `<Route path="Categorias" element={<Products defaultTab="Categorias" />} />`
     - Linha 153: `<Route path="Categorias" element={<Categories />} />`
     No menu lateral (`Layout.tsx`), o item "Centro de Custos" (do grupo Financeiro) aponta para `/Categorias`. O React Router resolve a primeira rota e abre a tela de Categorias de Produtos, impedindo o usuário de acessar o Centro de Custos financeiro.
  2. O componente `src/pages/AuditLogs.tsx` está totalmente desenvolvido (com filtros avançados, paginação por cursor, exportação CSV e visualização de diff de auditoria), mas não possui rota declarada em `App.tsx` nem link de menu em `Layout.tsx`.
- **O que falta finalizar:**
  - Desambiguar as rotas em `App.tsx`: mapear o Centro de Custos para `/CentroDeCustos` (ou `/CategoriasFinanceiras`) e manter `/Categorias` para produtos. Atualizar o link correspondente em `Layout.tsx`.
  - Registrar a rota `<Route path="Auditoria" element={<AuditLogs />} />` em `App.tsx` e disponibilizar link de navegação para usuários com perfil de auditoria/master.

---

### 2.2 Fiscal: Sincronização de Expiração do Certificado Digital
- **Arquivos:** `src/components/Fiscal/CertificateManager.tsx` e `src/pages/Fiscal.tsx`
- **Diagnóstico:**
  No `CertificateManager.tsx`, ao fazer upload do certificado A1 (.pfx) com a senha, o sistema extrai com sucesso a data de validade através de `node-forge` e grava o registro na coleção `certificates`. Contudo, **não atualiza o documento da empresa ativa** (`companies/{id}`) com os campos `fiscal_certificate_expiration` e `has_certificate: true`.
  Na tela `Fiscal.tsx`, o cabeçalho fiscal consulta `company?.fiscal_certificate_expiration` ou `company?.certificate_expiration`. Como esses campos permanecem vazios no documento da empresa, a tela continua alertando sobre ausência ou expiração de certificado.
- **O que falta finalizar:**
  - No sucesso do upload em `CertificateManager.tsx`, executar a atualização do documento `companies/{currentCompanyId}` gravando `fiscal_certificate_expiration` e `has_certificate: true`.
  - Invalidar a query `["company", currentCompanyId]` e `["companies"]` para sincronização imediata na tela de Notas Fiscais.

---

### 2.3 Fiscal: Disparo de E-mail de Nota Fiscal
- **Arquivos:** `src/pages/Fiscal.tsx` e `server.ts` (ou `src/serverApp.ts`)
- **Diagnóstico:**
  No modal de envio de e-mail de `Fiscal.tsx`, a função `handleSendEmail` faz `api.post("fiscal/send-email", ...)`. No cliente, o `api.post` envia para uma coleção do Firestore chamada `"fiscal/send-email"` em vez de realizar chamada HTTP ao backend Express (`/api/fiscal/send-email`). Além disso, o endpoint Express existente precisa responder com validação e status de sucesso para a UI.
- **O que falta finalizar:**
  - Ajustar o envio no cliente para invocar a rota de API via fetch HTTP (`/api/fiscal/send-email`).
  - Finalizar a resposta e tratamento de erro no endpoint de e-mail fiscal.

---

### 2.4 Fiscal & Vendas: Consistência no Cancelamento de Notas com SEFAZ
- **Arquivos:** `src/pages/SalesHistory.tsx` e `src/services/fiscalApi.ts`
- **Diagnóstico:**
  Ao cancelar uma venda em `SalesHistory.tsx` que possui NF-e ou NFC-e emitida, o sistema invoca `fiscalApi.cancel(...)`. Se a SEFAZ rejeitar o cancelamento (por exemplo, após o decurso do prazo regulamentar de 24h para NF-e ou 30min para NFC-e), o bloco `catch` emite apenas um `console.warn` e em seguida **força o status local da nota para "Cancelada"** (`api.put("invoices", inv.id, { status: "Cancelada" })`). Isso cria assincronia tributária crítica: a nota permanece ativa perante o fisco, mas é dada como cancelada no ERP.
- **O que falta finalizar:**
  - Interromper a alteração de status da nota fiscal para "Cancelada" quando o cancelamento for rejeitado pela SEFAZ.
  - Exibir modal ou toast específico informando a rejeição e orientando o operador a emitir uma Nota Fiscal de Devolução/Estorno.

---

### 2.5 Financeiro: Histórico e Auditoria de Importação OFX
- **Arquivos:** `src/pages/BankReconciliation.tsx` e `src/components/Financial/OFXImporter.tsx`
- **Diagnóstico:**
  O modal `OFXImporter.tsx` efetua a leitura do extrato OFX e concilia as movimentações, mas não salva o histórico do lote importado. Em contrapartida, `BankReconciliation.tsx` possui um card intitulado "Últimas Importações" que exibe estaticamente a mensagem: *"Nenhum histórico de importação disponível para esta conta."*
- **O que falta finalizar:**
  - Persistir o resumo do lote importado na coleção `bank_imports` ao finalizar o processo no `OFXImporter.tsx` (nome do arquivo, total de transações, total conciliadas, operador e timestamp).
  - Conectar a consulta dessa coleção em `BankReconciliation.tsx`, listando os lotes importados para a conta bancária selecionada.

---

### 2.6 Vendas: Acionamento do Pagamento em Lote de Comissões
- **Arquivos:** `src/pages/CommissionPayouts.tsx`
- **Diagnóstico:**
  No arquivo `CommissionPayouts.tsx`, existe uma mutação completa `batchPayoutMutation` (linhas 129 a 161) que processa em lote o pagamento das comissões pendentes filtradas e gera as entradas no Contas a Pagar. Porém, **não há nenhum botão ou gatilho visual na interface** para executá-la, forçando o gestor a pagar comissões clicando linha por linha.
- **O que falta finalizar:**
  - Adicionar o botão "Pagar Comissões Filtradas" junto à barra de ações/filtros.
  - Conectar ao modal de confirmação existente (`isConfirmBatchModalOpen`), disparando a mutação `batchPayoutMutation`.

---

### 2.7 Governança Multi-Tenant: Isolamento em Serviços e Vendedores
- **Arquivos:** `src/pages/Services.tsx` e `src/pages/Sellers.tsx`
- **Diagnóstico:**
  Ao salvar novos registros, `Services.tsx` (linha 84) e `Sellers.tsx` (linha 94) utilizam `company_id: user?.company_id` em vez de `currentCompanyId = api.getCompanyId() || user?.company_id;`. Quando um usuário Master ou Administrador alterna para uma empresa filial ou gerenciada, os novos serviços e vendedores são vinculados incorretamente à empresa matriz do usuário.
- **O que falta finalizar:**
  - Substituir `user?.company_id` por `currentCompanyId` nos formulários de cadastro e edição de `Services.tsx` e `Sellers.tsx`.

---

### 2.8 Configurações: Taxas de Cartão de Crédito e Débito na Aba Pagamentos
- **Arquivos:** `src/pages/Configurations.tsx` (Aba `payments`)
- **Diagnóstico:**
  A aba "Pagamentos" possui o cabeçalho descritivo *"Configure suas chaves PIX e taxas"*, mas apresenta unicamente o campo para inserção da Chave PIX. Os campos para Taxa de Cartão de Crédito (%) e Taxa de Cartão de Débito (%) — previstos na regra de negócio para apuração de taxas financeiras — não possuem inputs para edição.
- **O que falta finalizar:**
  - Adicionar os campos de entrada numérica `credit_card_rate` e `debit_card_rate` no formulário da aba `payments` de `Configurations.tsx`.
  - Salvar esses atributos no documento da empresa (`companies`).

---

## 3. Matriz de Prioridade Técnica

| Prioridade | Módulo | Pendência Identificada | Impacto da Finalização |
| :--- | :--- | :--- | :--- |
| **Crítica** | Fiscal / Vendas | Consistência de cancelamento fiscal de venda | Impede inconsistência legal e passivo tributário com a SEFAZ |
| **Crítica** | Fiscal | Sincronização de validade do certificado na empresa | Desbloqueia emissão e status correto de certificados no módulo fiscal |
| **Alta** | Roteamento | Conflito `/Categorias` e rota de `/Auditoria` | Restaura acesso ao Centro de Custos e habilita página de auditoria |
| **Alta** | Governança | Correção multi-tenant em Serviços e Vendedores | Evita contaminação de dados entre empresas distintas |
| **Média** | Financeiro | Histórico e auditoria de importação OFX | Fornece rastreabilidade real aos lotes de extratos bancários |
| **Média** | Vendas | Acionamento de pagamento de comissões em lote | Elimina esforço operacional repetitivo do gestor |
| **Baixa** | Fiscal | Disparo HTTP de e-mail de nota fiscal | Conecta frontend ao backend Express para envio de notas |
| **Baixa** | Configurações | Inclusão de taxas de cartão na aba de pagamentos | Completa formulário previsto na interface do ERP |

---

## 4. Próximas Etapas no Ciclo de Análise

1. **Especificação Técnica:** `/analytics/Spec.md` detalhando cada página, comportamento e componente a finalizar.
2. **Desmembramento em Issues:** Pasta `/analytics/issues/` com arquivos atômicos por pendência.
3. **Plano de Implementação:** `/analytics/issues/plan.md` estruturando a ordem de execução sem implementar.
