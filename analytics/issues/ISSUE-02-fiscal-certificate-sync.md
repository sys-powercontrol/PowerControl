# ISSUE-02: Sincronização de Validade do Certificado na Empresa — [CONCLUÍDO]

**Data e Hora de Geração:** 03 de Setembro de 2026 às 10:40:18 (Horário de Brasília - UTC-3)  
**Data de Conclusão:** 03 de Setembro de 2026 às 10:50:35 (Horário de Brasília - UTC-3)  
**Módulo:** Fiscal  
**Prioridade:** Crítica  
**Status:** **[CONCLUÍDO]**

---

## 1. Contexto & Diagnóstico
- Ao realizar o upload do certificado digital A1 (.pfx) em `CertificateManager.tsx`, a data de validade é extraída via biblioteca `node-forge` e salva na coleção `certificates`.
- O documento da empresa ativa (`companies/{companyId}`) não recebia a atualização dos campos `fiscal_certificate_expiration` e `has_certificate: true`.
- Consequentemente, a tela `Fiscal.tsx` exibia avisos de certificado ausente ou expirado mesmo após o upload de um certificado válido.

---

## 2. Escopo da Finalização Executado
- **Em `src/pages/CertificateManager.tsx`:**
  - [x] Após a gravação na coleção `certificates`, executa a atualização da empresa ativa:
    ```typescript
    await api.put("companies", currentCompanyId, {
      fiscal_certificate_expiration: certData.expiration_date,
      certificate_expiration: certData.expiration_date,
      has_certificate: true,
      updated_at: new Date().toISOString()
    });
    ```
  - [x] Invalidadas as queries `["company", currentCompanyId]`, `["companies"]` e `["certificates"]`.
  - [x] Ao remover um certificado ativo, atualiza o status ou promove o próximo certificado.

---

## 3. Critérios de Aceite Verificados
- [x] Ao enviar um arquivo de certificado A1 válido com sua respectiva senha, o badge na tela de Notas Fiscais indica imediatamente a validade e status ativo sem necessidade de recarregar a página.
