# 2. Dinamismo da Base de Conhecimento (Fim do Mock Local)
*   **Page:** `src/pages/KnowledgeBase.tsx`
*   **Component:** Listagem de Artigos (`categories`), Roteador de Conteúdo (`ArticleViewer`)
*   **Behavior:** 
    *   Excluir os dados simulados e estáticos (`const categories`) diretamente injetados no código-fonte.
    *   Desenvolver o carregamento dessas informações por meio de uma coleção real do Firestore.
    *   Criar estado e renderização do artigo (possivelmente suportando Markdown) para que o usuário clique no treinamento listado e leia o seu conteúdo textual na interface correspondente.
