# Issue 35: Inteligência de Conciliação OFX

## Descrição
Melhorar o importador de OFX com lógica para sugerir automaticamente o vínculo entre transações bancárias e lançamentos do ERP.

## Requisitos
- Atualizar `src/components/OFXImporter.tsx`.
- Implementar algoritmo de busca no Firestore por lançamentos (Contas a Pagar/Receber) com valores idênticos.
- Adicionar tolerância de data (ex: +/- 3 dias) para sugestão de match.
- Criar interface visual para o usuário confirmar ou rejeitar as sugestões de conciliação automática.
