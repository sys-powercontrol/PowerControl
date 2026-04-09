# Issue 33: Refinamento de Cálculos Tributários

## Descrição
Expandir a biblioteca fiscal para suportar cálculos tributários mais complexos e conformidade com diferentes regimes.

## Requisitos
- Atualizar `src/lib/fiscal.ts`.
- Implementar cálculo de ICMS-ST (Substituição Tributária).
- Refinar a lógica de determinação de CFOP para diferenciar operações de revenda, industrialização e uso/consumo.
- Adicionar suporte para cálculo de IPI e DIFAL (Diferencial de Alíquota).
- Garantir que os cálculos considerem o regime tributário da empresa (Simples Nacional vs Regime Normal).
