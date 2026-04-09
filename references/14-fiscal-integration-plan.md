# Plano de Implementação: Integração Fiscal (NFe/NFCe)

Este documento detalha o plano para a implementação da **Issue 14**, substituindo o sistema mock atual por uma integração real com a API da **FocusNFe**.

## 1. Arquitetura da Integração

### 1.1. Provedor de API: FocusNFe
- **Por que FocusNFe?** Documentação robusta em português, suporte a ambiente de homologação (sandbox) e webhooks para atualizações de status.
- **Autenticação**: Token de API configurado no servidor.

### 1.2. Fluxo de Dados
1.  **Venda**: Usuário finaliza a venda no PDV (`Sales.tsx`).
2.  **Emissão**: O frontend chama o backend proxy `POST /api/fiscal/emit`.
3.  **Processamento**: O backend mapeia os dados da venda + regras tributárias (`TaxRule`) para o formato JSON da FocusNFe.
4.  **SEFAZ**: A FocusNFe envia para a SEFAZ e retorna um ID de processamento.
5.  **Status**: O sistema monitora o status via Webhook ou polling.
6.  **Documentos**: Links para XML e PDF (DANFE) são armazenados no Firestore.

---

## 2. Implementação Backend (`server.ts`)

### 2.1. Variáveis de Ambiente
Adicionar ao `.env`:
- `FOCUS_NFE_TOKEN`: Token fornecido pela FocusNFe.
- `FOCUS_NFE_ENV`: `sandbox` ou `production`.

### 2.2. Rotas de Proxy
- `POST /api/fiscal/emit`: 
    - Recebe `sale_id`.
    - Busca dados da venda, cliente, empresa e produtos.
    - Aplica regras de NCM e CFOP cadastradas em `tax_rules`.
    - Envia para `https://api.focusnfe.com.br/v2/nfe`.
- `GET /api/fiscal/status/:id`: Consulta status atual na API.
- `POST /api/fiscal/cancel/:id`: Solicita cancelamento com justificativa.
- `POST /api/webhooks/fiscal`: Recebe notificações da FocusNFe e atualiza o Firestore.

---

## 3. Implementação Frontend

### 3.1. Serviço: `src/services/fiscalService.ts`
- Encapsular chamadas ao backend proxy.
- Gerenciar estados de carregamento e erros específicos da SEFAZ.

### 3.2. Componentes UI
- **`NfeStatusBadge`**: Componente visual para status (Autorizada, Rejeitada, Cancelada, Pendente).
- **`DanfeViewer`**: Modal para visualizar o PDF da nota.
- **`FiscalSettings`**: Interface para configurar Token e Certificado A1.

### 3.3. Integração no PDV (`Sales.tsx`)
- Adicionar botão "Emitir NF-e" no modal de sucesso da venda.
- Exibir status da emissão em tempo real.

---

## 4. Estrutura de Dados (Firestore)

### Coleção `invoices`
```json
{
  "sale_id": "ID_DA_VENDA",
  "company_id": "ID_DA_EMPRESA",
  "number": "000123",
  "series": "001",
  "status": "autorizado",
  "key": "CHAVE_ACESSO_44_DIGITOS",
  "protocol": "PROTOCOLO_SEFAZ",
  "xml_url": "URL_DO_XML",
  "pdf_url": "URL_DO_DANFE",
  "rejection_reason": "Motivo caso rejeitada",
  "created_at": "TIMESTAMP"
}
```

---

## 5. Próximos Passos (Ordem de Execução)
1.  [ ] Configurar `.env.example` e `server.ts` com as rotas de proxy.
2.  [ ] Criar o serviço `fiscalService.ts`.
3.  [ ] Atualizar a página `Fiscal.tsx` para listar dados reais.
4.  [ ] Implementar o componente `NfeStatusBadge`.
5.  [ ] Adicionar o fluxo de emissão em `Sales.tsx`.
6.  [ ] Implementar o Webhook para atualizações automáticas.
