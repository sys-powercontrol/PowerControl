# Issue 25: Biblioteca de Cálculos Tributários e CFOP Dinâmico

## Descrição
Implementar a lógica de cálculo de impostos e automação de CFOP.

## Requisitos
- Criar `src/lib/fiscal.ts`.
- Implementar funções de cálculo para ICMS, IPI, PIS, COFINS e ISS.
- Basear cálculos no NCM do produto e regime tributário da empresa.
- Implementar lógica de CFOP Dinâmico:
    - Comparar UF da empresa vs. UF do cliente.
    - Alternar entre operação interna (ex: 5102) e interestadual (ex: 6102).
- Integrar cálculos no PDV para exibir impostos aproximados.
