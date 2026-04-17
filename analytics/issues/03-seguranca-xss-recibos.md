# Issue 03: Segurança Contra Injeção XSS nas Impressões de Recibos

**Alvos (Arquivos/Utilitários):**
*   `src/lib/utils/print.ts`

**Comportamento Esperado:**
*   O utilitário de impressão não deve concatenar entradas dos usuários via *Template Strings* (como nomes de produtos: `${item.name}`) diretamente e puramente no HTML injetável do DOM.
*   Todas as chaves interpoladas dependentes de cadastros e inserções de texto livre devem passar por uma rotina de `escaping` (substituição de `<` por `&lt;`, de aspas e injeções de quebra de tags) ou validação via biblioteca de `sanitize` para evitar a contaminação local no navegador via injeção HTML/JS.
