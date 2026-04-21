# Product Requirements Document (PRD) - PowerControl ERP & PDV

## 1. Visão Geral do Produto
O **PowerControl** é um sistema ERP e PDV (Ponto de Venda) em nuvem focado em alta disponibilidade e operação ininterrupta. Desenhado para micro, pequenas e médias empresas do varejo, o sistema funde a praticidade de um PDV ágil com a robustez de um controle financeiro e fiscal profundo.

Sua maior proposta de valor é a arquitetura **Offline-First**, atuando via PWA (Progressive Web App). Isso garante que o Frente de Caixa (vendas), o cadastro de clientes, as compras e os lançamentos  financeiros continuem operando perfeitamente mesmo durante quedas severas de internet corporativa, com sincronização assíncrona automática.

## 2. Púbico-Alvo
Lojistas, comércios de rua, franquias, conveniências e prestadores de serviços de pequeno a médio porte que buscam:
- Gestão centralizada (Filiais lidadas de forma independente numa conta *multi-tenant* se necessário).
- Menor taxa de interrupção (Frente de caixa não pode parar).
- Conformidade Fiscal simplificada.
- Governança Financeira (Prevenção de fraudes, controle de estornos, blindagem de caixa diário).

## 3. Arquitetura e Stack Tecnológico
*   **Front-end:** React 18+, TypeScript, Tailwind CSS, Vite.
*   **State & Cache:** TanStack Query (React Query) para controle impecável de revalidação de dados remotos.
*   **Back-end & Database:** Firebase Authentication (Gestão de Identidade) e Cloud Firestore (Banco de Documentos NoSQL em Tempo Real).
*   **PWA & Offline:** Workbox + IndexedDB (`idb`) gerenciado nativamente pelo Service Worker (`sw.ts`) provendo filas e resiliência offline transversal (não apenas para vendas).
*   **Segurança:** Firestore Security Rules isoladas por tenant (`company_id`) com hierarquia (Roles: Owner, Admin, Manager, Cashier).

## 4. Módulos do Sistema e Funcionalidades

### 4.1 Frente de Caixa (PDV) - `/sales`
*   **Motor de Vendas:** Rápida adição de itens por busca via texto ou leitor de código de barras. Permite desconto em valor ou percentual.
*   **Checkout Multimodal:** Suporte a pagamentos em Dinheiro, Crédito, Débito, PIX, Boleto e Duplo Pagamento (Misto). 
*   **Integração PIX Dinâmico:** Geração algorítmica de QR Code (EMV) atrelada à *chave PIX* ativada pela companhia. Exibe instantaneamente em tela com CRC16-CCITT assinado. Fallback e simulações para falhas de rede.
*   **Gateway Simulado:** Componente de pagamento em tela (`PaymentGateway`) processando e retendo logs das simulações para fechamento.
*   **Impressão:** Geração de Ticket (Recibo) da venda concluída.
*   **Offline Global:** Todo o fluxo do POS salva as vendas e o "carrinho" no IndexedDB caso caia a conexão. Retentativa gerenciada pelo `sw.ts` via API Web Sync em background (3 tentativas com abandono lógico anti-loop).

### 4.2 Estoque e Compras - `/inventory` & `/purchases`
*   **Controle de Itens:** Cadastro com código de barras, NCM, CEST e CFOPs. Categorização inteligente.
*   **Compras e Entrada Fiscal:** Adição de notas e recebimento por fornecedor. O painel inclui um motor tributário (`fiscal.ts`) que avalia estados (Origem -> Destino), contribuinte e finalidade (Consumo/Revenda) e calcula base de IPI, ICMS, PIS e COFINS automaticamente integrando ao custo do item.
*   **Alertas:** Níveis de estoque mínimo.
*   **Resiliência Offline:** Entrada de Compras ("Purchases") agora conta com fallback (via `offlineStore`), engolindo envios perigosos feitos na instabilidade da rede.

### 4.3 Gestão Financeira (Blindada) - `/accounts-*` & `/cashiers`
Este módulo foca na estabilidade técnica de auditorias e conciliações (Anti-Orphaned Writes).
*   **Contas a Pagar/Receber:** Registro com opções de recorrência, mapeamento de fornecedores/clientes, e histórico mapeado para alteração técnica de datas.
*   **Fluxo de Estornos Seguro:** Para contas já baixadas/pagas (onde os saldos já abateram nos bancos/caixas), há um bloqueio total na exclusão do título (Lixo). O lojista é obrigado a "Estornar", e este estorno só ocorre se:
  1. A fonte pagadora (Conta ou Caixa) existir.
  2. A fonte pagadora (Caixa) estiver com status `"Aberto"`. Caso fechado, o estorno programático inter-turnos é negado para preservar o D0 auditado, forçando apontamento manual de movimentação.
*   **Bancos e Movimentação Lançada:** Fluxo de sangria, aporte e despesas diretas na conta bancária simulada ou gaveta física (`cashiers`).

### 4.4 Configurações Gerais e Fiscal - `/configurations`
*   **Tenant & Filial (Company):** Definição de logomarcas, endereços, Chave PIX, e o principal: Enquadramento fiscal (Simples Nacional vs. Regime Normal / Lucro Presumido).
*   **Motor Fiscal API:** Suporte e chaves parametrizáveis a Emissores. Conta com suporte construtivo às apis logísticas de DANFE, NFC-e das empresas `FocusNFe` e destravado logicamente para `WebmaniaBR`.
*   **Exportação de Dados:** Exportadores (.csv, .xlsx, pdf) anexados às abas de listas de todo o app.

### 4.5 CRM - Cadastro de Clientes - `/clients`
*   Formulário veloz de captação, busca simplificada no PDV (apenas por Nome e CPF).
*   Integração com ViaCEP para agilizar autocompletar de ruas e bairros.
*   PWA Resiliente: Interrupções salvam clientes criados ou editados no IndexedDB e processam silenciosamente na retomada da conexão.

### 4.6 Base de Conhecimento e Suporte - `/knowledge-base` & `/support`
*   **Base de Conhecimento Dinâmica:** Artigos corporativos salvos documentados em `react-markdown` via fetch com Firestore. Mapeamento de coleções com Categorias que convertem nome para ícones de UI (Lucide).
*   **Ticket de Suporte Bidirecional:** Funcional de Webhooks interligável pro mundo externo (Admin visualiza). Fluxos de abertura, "internal_notes", réplicas do usuário (`SupportTicketChat`), permitindo reaberturas orgânicas de tickets até o status `RESOLVED`.
*   *(Webhook)* URL atrelada às enviáveis globais, mas aptas a se desvincularem do .env indo para UI em versões vindouras.

## 5. Requisitos Não-Funcionais
*   **Responsividade:** Uso global do `Tailwind CSS` em abordagem Mobile-First nas telas operacionais e de card/list para PDV em Tablets e Desktops.
*   **Zero-State e Feedback:** Telas lógicas de Empty States, Esqueletos (Skeletons - UX de carregamento contínuo das queries de TanStack), falhas tratadas na interface com pacotes `sonner` / Toasts.
*   **Auditoria Interna & Tracking:** Movimentações de estorno, trocas de data de faturas, exclusões vitais têm histórico armazenado em objeto na matriz (`due_date_history`, payload invisível contendo usuário).
*   **Versionamento Seguro:** `rules_version = '2'` do Firestore, garantindo limitação de CRUD a apenas IDs autorizados atrelados rigorosamente ao ID da Companhia vigente na request Auth. 

## 6. Backlog Estratégico & Evolução (Roadmap Futuro)
- Integração plena e em tempo real com APIs WebmaniaBR (Envio efetivo do Sefaz em homol/prod).
- Módulo de relatórios densos (DRE, Curva ABC de Produtos, Fechamentos Gerenciais unificados por trimestre).
- Customização de Perfis Genéricos de "Administrador Master" (Acesso cross-tenant para equipe desenvolvedora).
- Painéis Interativos para Webhooks no Portal do Cliente (ao invés de setar URL local no `.env`).
