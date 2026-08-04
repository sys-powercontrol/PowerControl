# Issue 04: Empacotamento de XMLs Fiscais em ZIP e Sincronização de Contingência

**Data e Hora de Geração:** 03/08/2026 20:34:20 (Horário de Brasília - BRT)

---

## 1. Descrição
Disponibilizar a exportação mensal compactada em ZIP com os arquivos XML de NF-e e NFC-e autorizados para envio à contabilidade, e consolidar a rotina de reprocessamento e sincronização de notas presas em contingência.

---

## 2. Componentes e Arquivos
- **Frontend / Serviços:** `src/pages/Fiscal.tsx`, `src/lib/fiscal.ts`, `src/services/fiscalApi.ts`
- **Banco de Dados:** Firestore (`fiscal_invoices`)

---

## 3. Requisitos de Comportamento
1. Adicionar o botão "Exportar XMLs do Mês (ZIP)" na interface `Fiscal.tsx`.
2. Buscar todos os registros de notas fiscais com status `authorized` do mês/ano filtrado, compactar utilizando `JSZip` e disparar download automático (`xmls_nfe_MM_YYYY.zip`).
3. Criar a ação de "Sincronizar Contingência" para reconsultar a API fiscal referente às notas com status `pending` ou `contingency`, atualizando o status final de autorização ou rejeição.
