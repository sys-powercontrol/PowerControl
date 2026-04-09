# Issue 32: Armazenamento e Vínculo de XML Fiscal

## Descrição
Implementar a persistência física dos arquivos XML das notas fiscais emitidas e vincular o link de download ao registro da nota.

## Requisitos
- Atualizar `src/services/fiscalApi.ts` e `src/pages/Fiscal.tsx`.
- Após a autorização da SEFAZ, realizar o upload do arquivo XML para o Firebase Storage.
- Estrutura de pastas sugerida: `invoices/{company_id}/{year}/{month}/{key}.xml`.
- Salvar a `download_url` gerada no documento da nota fiscal no Firestore.
- Adicionar botão de "Baixar XML" na listagem de notas fiscais.
