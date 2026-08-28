# Issue 06 - Finalização de Suporte, Anexos e Logs de Auditoria

**Data e Hora de Geração:** 28 de Agosto de 2026 às 15:36:44 (Horário de Brasília - UTC-3)  
**Módulo:** Suporte & Auditoria  
**Documento de Origem:** `analytics/Spec.md` - Seção 2.6  
**Criticidade:** Média  

---

## 1. Descrição do Problema
O módulo de chamados de suporte técnico e a tela de logs de auditoria estão disponíveis. Falta finalizar a renderização e visualização ampliada (lightbox) de imagens anexadas aos tickets de atendimento e assegurar que as ações sensíveis do sistema gerem registros padronizados na coleção `audit_logs`.

---

## 2. Escopo de Finalização (Sem Novas Funcionalidades)

### 2.1. Upload e Visualização de Anexos em Chamados de Suporte
- **Arquivos:** `src/pages/Support.tsx`
- **Ação:**
  1. Permitir a inclusão de imagens nos tickets de suporte e mensagens de resposta.
  2. Implementar visualização em modal/lightbox com suporte a download da imagem original.

### 2.2. Padronização e Cobertura de Logs de Auditoria
- **Arquivos:** `src/pages/AuditLogs.tsx`, `src/lib/api.ts`
- **Ação:**
  1. Assegurar que ações críticas (cancelamento de notas e vendas, estornos de títulos, modificação de regras fiscais e desassociação de usuários) invoquem o método `api.log()`.
  2. Garantir a correta exibição dos detalhes nos filtros da tela de logs.

---

## 3. Critérios de Aceite
- [ ] Anexos de imagem em chamados de suporte podem ser ampliados e baixados.
- [ ] Ações críticas do sistema geram registros rastreáveis em `audit_logs`.
