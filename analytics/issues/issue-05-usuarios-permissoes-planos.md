# Issue 05 - Finalização da Gestão de Usuários, Múltiplas Empresas e Planos

**Data e Hora de Geração:** 28 de Agosto de 2026 às 15:36:44 (Horário de Brasília - UTC-3)  
**Módulo:** Usuários, Permissões & Planos  
**Documento de Origem:** `analytics/Spec.md` - Seção 2.5  
**Criticidade:** Média  

---

## 1. Descrição do Problema
O sistema gerencia colaboradores vinculados a empresas e controle de acesso a funcionalidades de acordo com o plano contratado. É necessário finalizar a desvinculação atômica entre usuário e empresa e garantir a correta sobreposição do modal de upgrade ao tentar utilizar recursos bloqueados pelo plano (como upload de imagens de produtos).

---

## 2. Escopo de Finalização (Sem Novas Funcionalidades)

### 2.1. Desvinculação Segura e Atômica de Colaboradores
- **Arquivos:** `src/pages/Employees.tsx`
- **Ação:**
  1. Ao excluir ou desvincular um colaborador em `Employees.tsx`, remover o identificador da empresa do array `company_ids` no perfil do usuário em `users/{userId}`.
  2. Inativar ou remover o documento correspondente na subcoleção/coleção `employees`.

### 2.2. Enforcement de Restrição de Imagens e Chamada de Upgrade Modal
- **Arquivos:** `src/pages/Products.tsx`, `src/components/ProductDetailsModal.tsx`, `src/components/UpgradePlanModal.tsx`
- **Ação:**
  1. Quando `disable_product_images` estiver ativo no plano da empresa, desabilitar campos de anexo de foto no cadastro/edição de produtos.
  2. Assegurar que o `UpgradePlanModal` seja acionado com `z-[999999]` sobrepondo os demais modais da tela.

---

## 3. Critérios de Aceite
- [ ] Remoção de colaborador atualiza `users` e `employees` de forma consistente.
- [ ] Tentativa de inserção de imagens em plano restrito aciona o modal de upgrade visível e interativo.
