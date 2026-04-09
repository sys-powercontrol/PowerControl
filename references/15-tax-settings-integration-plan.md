# Plano de Integração: Configurações Tributárias (Issue 15 - Fase 2)

Embora a página básica de `TaxSettings.tsx` já tenha sido implementada, a integração total com o restante do sistema (Produtos e Vendas) ainda é necessária para que os cálculos fiscais sejam automatizados.

## 1. Atualização do Modelo de Dados

### 1.1. Entidade `Product` (Firestore)
Adicionar os seguintes campos ao `firebase-blueprint.json` e formulário de produtos:
- `ncm`: Código NCM do produto (8 dígitos).
- `tax_rule_id`: Referência para a regra cadastrada em `tax_rules`.
- `origin`: Origem da mercadoria (Nacional, Importada, etc. - Tabela de Origem da NF-e).

### 1.2. Entidade `Category` (Firestore)
- `default_tax_rule_id`: Regra fiscal padrão para todos os produtos desta categoria (facilita o cadastro em massa).

---

## 2. Lógica de Cálculo (Utility)

### 2.1. Função `calculateTaxes`
Criar `src/lib/fiscal.ts` com a lógica:
```typescript
interface TaxResult {
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  total_taxes: number;
  cfop: string;
}

export function calculateTaxes(
  amount: number, 
  taxRule: any, 
  isInterstate: boolean
): TaxResult {
  // Lógica de cálculo baseada nas alíquotas da regra
  // Seleção do CFOP (Interno vs Interestadual)
}
```

---

## 3. Integração na Interface de Produtos

### 3.1. Página `Products.tsx`
- Atualizar o modal de cadastro de produtos para incluir a seleção de **Regra Fiscal**.
- Adicionar campo de busca de NCM (opcional: integrar com API externa de NCM para preenchimento automático).

---

## 4. Integração no PDV (`Sales.tsx`)

### 4.1. Visualização de Impostos
- No carrinho de compras, exibir uma estimativa de impostos (Lei da Transparência - Lei 12.741/2012).
- Ao selecionar o cliente, verificar se o endereço é de outro estado para aplicar o **CFOP Interestadual** e alíquotas correspondentes.

---

## 5. Próximos Passos (Ordem de Execução)
1.  [ ] Atualizar `firebase-blueprint.json` com os novos campos de `Product` e `Category`.
2.  [ ] Criar a biblioteca de utilitários fiscais `src/lib/fiscal.ts`.
3.  [ ] Modificar o formulário de Produtos para suportar dados fiscais.
4.  [ ] Implementar a exibição de impostos estimados no carrinho de `Sales.tsx`.
5.  [ ] (Opcional) Integrar API de consulta de NCM (ex: Cosmos ou similar).
