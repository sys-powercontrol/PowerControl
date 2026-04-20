# 3. Destravamento da Fila Fiscal WebmaniaBR
*   **Page:** `src/pages/Configurations.tsx`
*   **Component:** Aba `Integração Fiscal` (Select do campo `fiscal_provider`)
*   **Behavior:** 
    *   Remover a trava HTML `disabled` da `<option value="WebmaniaBR">` sinalizada no front-end como "(Em breve)".
    *   Garantir a total liberação na seleção pela interface para que os lojistas possuam autonomia em utilizar esse provedor perfeitamente integrado no backend (em `fiscalApi.ts`).
