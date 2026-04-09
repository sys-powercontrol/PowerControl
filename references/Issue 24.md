# Issue 24: Integração Fiscal Real e Armazenamento de XML

## Descrição
Substituir o fluxo mock de NFe por integração real e gerenciar arquivos XML.

## Requisitos
- Criar `src/services/fiscalApi.ts`.
- Integrar com FocusNFe ou Webmaniabr.
- Enviar JSON da venda e tratar retorno (protocolo, chave, XML).
- Implementar lógica para salvar o XML no Firebase Storage.
- Vincular a URL do XML salvo ao documento da nota no Firestore.
