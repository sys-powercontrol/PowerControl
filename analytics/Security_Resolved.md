# Security Rules Resolution

All reported vulnerabilities and logical omissions have been resolved in \`firestore.rules\`.

1. **Auth Integrity**: \`request.auth.token.email_verified == true\` was mandated globally for \`isAuthenticated()\`, eliminating spoofing risks natively.
2. **Strong Typing & Update Boundaries**: Fully typed schemas injected: \`isValidProduct()\`, \`isValidMovement()\`, \`isValidInvoice()\`, etc., constraining specific bounds for 15+ entities and sizes limit.
3. **Strict Creation Guard**: All document types now enforce \`data.keys().hasAll([]) && data.keys().size() == N\` upon block creation.
4. **Total ID and Limits**: \`isValidId(id)\` bounds extended globally.
5. **N+1 Read Optimization**: Custom claim short-circuiting has been enabled: \`getUserCompanyId()\` relies on \`request.auth.token.company_id\` falling back gracefully to \`getUserData()\`, drastically accelerating query filters on listing without repeatedly hitting user documents when custom claims exist.
6. **Terminal State Locking**:
   - Accounts (Receivable/Payable) locked when status is "Pago".
   - Purchases securely lock items & total if "Concluída".
   - Invoices secure structural data if status is "Emitida" or "Cancelada".

All issues derived from \`analytics\/Spec.md\` and \`analytics\/security.md\` are closed and removed.
