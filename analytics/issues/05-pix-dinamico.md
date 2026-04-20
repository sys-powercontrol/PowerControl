# 5. Algoritmo PIX Dinâmico no PDV
*   **Page:** `src/pages/Sales.tsx`, `src/pages/Configurations.tsx`
*   **Component:** Modal do PDV (`CheckoutModal`), Componente Emissor (`QRCodeManager`)
*   **Behavior:** 
    *   No estado vigente o lojista consegue armazenar a chave PIX, porém seu PDV não tira proveito real disso.
    *   Furar a dependência estática por meio de uma rotina ou biblioteca capaz de aglutinar a string PIX do Lojista + Soma do Checkout ("Valor do Carrinho") gerando fisicamente via tela o **QR Code (BR Code / Copia e Cola) validado**. Integrar esse display diretamente na etapa final do caixa.
