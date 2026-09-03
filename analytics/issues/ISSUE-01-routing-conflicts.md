# ISSUE-01: Resolução de Conflito de Rota /Categorias e Inclusão de /Auditoria — [CONCLUÍDO]

**Data e Hora de Geração:** 03 de Setembro de 2026 às 10:40:18 (Horário de Brasília - UTC-3)  
**Data de Conclusão:** 03 de Setembro de 2026 às 10:50:35 (Horário de Brasília - UTC-3)  
**Módulo:** Roteamento e Navegação  
**Prioridade:** Alta  
**Status:** **[CONCLUÍDO]**

---

## 1. Contexto & Diagnóstico
- Em `src/App.tsx`, existiam duas rotas com o caminho `Categorias`:
  - `<Route path="Categorias" element={<Products defaultTab="Categorias" />} />`
  - `<Route path="Categorias" element={<Categories />} />`
- O submenu "Financeiro" em `src/components/Layout.tsx` possuía o item "Centro de Custos" apontando para `/Categorias`, abrindo indevidamente a tela de categorias de produtos.
- O componente `src/pages/AuditLogs.tsx` estava implementado mas sem rota correspondente nem item de menu para acesso de usuários autorizados.

---

## 2. Escopo da Finalização Executado
- **Em `src/App.tsx`:**
  - [x] Rota de Centro de Custos renomeada para `path="CentroDeCustos"` apontando para `<Categories />`.
  - [x] Adicionada a rota `<Route path="Auditoria" element={<AuditLogs />} />`.
- **Em `src/components/Layout.tsx`:**
  - [x] Alterado o link de "Centro de Custos" no submenu financeiro de `/Categorias` para `/CentroDeCustos`.
  - [x] Adicionado o item "Auditoria" sob a permissão `audit.view`.

---

## 3. Critérios de Aceite Verificados
- [x] Ao clicar em "Centro de Custos" no menu financeiro, a aplicação abre a página de Centro de Custos (`Categories.tsx`).
- [x] Ao clicar em "Categorias" no menu de produtos, abre a aba de categorias de produtos.
- [x] A página `/Auditoria` é acessível e lista os registros de auditoria do sistema para perfis com permissão `audit.view`.
