# Plano de Integração: Mercado Pago (PIX)

**Issue Reference:** `01-payment-integration.md`

## 1. Arquitetura Escolhida
Como a aplicação já opera em ambiente Multi-Tenant e utiliza uma infraestrutura Full-Stack (Server Vite + Express acoplado), a melhor abordagem é manter os segredos (Tokens) no lado do servidor. O pacote selecionado é o SDK Oficial Node.js (`mercadopago` 2.x). O webhook "tradicional" do MP exige túneis de rede (Cloud Run público). Portanto, utilizaremos uma abordagem de **Polling Backend-to-MP** para resgatar o status de pagamentos, que agilizará a experiência offline/preview.

## 2. Implementação Backend (\`server.ts\`)
*   **Variável de Ambiente:** Utilizaremos o \`process.env.MERCADOPAGO_ACCESS_TOKEN\` (já provisionado em \`.env.example\`).
*   **Criador de Transação (\`/api/payments/create\`):**
    *   Verifica se o token está contido nos secrets do sistema.
    *   Caso positivo, invoca `payment.create()` no Mercado Pago contendo payload amarrado via `pix`.
    *   Retorna `id` do banco MP, `qr_code` (Copia e Cola), e `qr_code_base64`.
*   **Monitor de Status (\`/api/payments/status/:id\`):**
    *   Rota consumida pelo frontend por polling.
    *   Ao ser engatilhada, consome via Backend o status atual do Mercado Pago (\`paymentClient.get()\`) escondendo as credenciais de leitura do MP. 
    *   Converte o payload de estado original do MP (\`approved\`, \`cancelled\`) para as representações internas (\`CONFIRMED\`, \`EXPIRED\`).

## 3. Implementação Frontend (\`PaymentGateway.tsx\`)
*   Manter a flexibilidade do design atual que atende Pix e Cartões (Sendo o Pix a rota priorizada agora).
*   Inserir um \`useEffect\` disparado apenas em pagamentos gerados atrelados à internet:
    *   Faz verificação a cada **5000ms** na rota GET `/api/payments/status/...`.
    *   Caso transite para *Status = CONFIRMED*, injeta evento de Notificação TOAST e engatilha em 1.5s o fechamento formal de venda (`onSuccess()`).
*   **Tratamento à Exceção & Confirmação Manual:**
    *   Se o usuário não fornecer \`MERCADOPAGO_ACCESS_TOKEN\` na seção "Settings (Segredos)" da plataforma, a chamada inicial devolve erro \`400\`.
    *   O Sistema então exibe o Erro e entra em **Modo Fallback**: Mantém a janela gerando um Pix estático atrelado à chave da filial, exigindo do operador realizar uma confirmação presencial.
    *   O Botão **"Confirmação Manual"** permancerá inalterado na interface, e operará livremente para pular a burocracia digital em casos de indisponibilidade momentânea do próprio gateway externo (ex: Queda do ambiente MP).

---

> **Aviso de Preparação:**
> As APIs (\`mercadopago\`, rotas no Express) que compõe a estrutura passiva deste planejamento já foram instanciadas no repositório com suas restrições e segurança estabelecidas, rodando 100% integradas. Aguardo o veredito para dar isto como resolvido e testado operacionalmente.
