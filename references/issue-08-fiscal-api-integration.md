# Issue 08: Integração Fiscal Real (`fiscalApi.ts`)

## Descrição
Substituir a lógica de simulação fiscal por uma integração real com API.

## Requisitos
- Criar o serviço `src/services/fiscalApi.ts`.
- Provedor sugerido: FocusNFe ou WebmaniaBR.
- Fluxo de Implementação:
    1. Envio do JSON da venda para a API do provedor.
    2. Recebimento e armazenamento do protocolo e chave de acesso.
    3. Download automático do XML e PDF (DANFE).
    4. Atualização automática do status da nota no Firestore.
