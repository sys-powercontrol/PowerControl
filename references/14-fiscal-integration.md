# Issue 14: Integração de API: Fiscal (NFe/NFCe)

## Descrição
Implementar a integração real com APIs de emissão de documentos fiscais (NFe/NFCe).

## Critérios de Aceite
- [ ] **Integração**: Integrar com uma API de emissão fiscal (ex: FocusNFe, Webmaniabr).
- [ ] **Emissão**: Enviar os dados da venda para a API fiscal e processar a resposta da SEFAZ.
- [ ] **Status**: Exibir o status da nota na SEFAZ (Pendente, Autorizada, Rejeitada, Cancelada).
- [ ] **DANFE**: Gerar o link para o DANFE (Documento Auxiliar da Nota Fiscal Eletrônica) ao ser autorizada.
- [ ] **XML**: Armazenar o XML da nota autorizada no Firestore ou Storage.

## Detalhes Técnicos
- **API**: FocusNFe, Webmaniabr.
- **Biblioteca**: Utilizar `axios` ou `fetch` para realizar as requisições.
- **Validação**: Verificar se os dados fiscais da empresa e do cliente estão completos antes de emitir a nota.
- **Componente**: `/src/components/Fiscal/NfeStatusBadge.tsx`.
- **Integração**: Adicionar um botão de emissão na página de vendas (`Sales.tsx`).
