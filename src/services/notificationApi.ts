import axios from "axios";
import { api } from "../lib/api";

export const notificationApi = {
  async sendSupportWebhook(ticketData: any) {
    // 1. Sempre registrar notificação interna no ERP para administradores
    try {
      if (ticketData.company_id) {
        await api.post("notifications", {
          company_id: ticketData.company_id,
          title: `Novo Chamado #${ticketData.id ? String(ticketData.id).slice(0, 8).toUpperCase() : 'SUPORTE'}`,
          message: `${ticketData.user_name || 'Usuário'} abriu o chamado: "${ticketData.subject}"`,
          type: "support",
          link: "/Suporte",
          for_role: "admin",
          read: false,
          status: "unread",
          created_at: new Date().toISOString()
        });
      }
    } catch (notifErr) {
      console.warn("Erro ao registrar notificação interna de suporte:", notifErr);
    }

    // 2. Disparar webhook externo caso configurado
    const webhookUrl = import.meta.env.VITE_SUPPORT_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn("VITE_SUPPORT_WEBHOOK_URL não configurada. Webhook ignorado.");
      return;
    }

    try {
      // Payload compatível com Slack e Discord
      await axios.post(webhookUrl, {
        text: `Novo chamado de suporte aberto!\n*Assunto:* ${ticketData.subject}\n*Usuário:* ${ticketData.user_name} (${ticketData.user_email})\n*Mensagem:* ${ticketData.message}`,
        content: `Novo chamado de suporte aberto!\n**Assunto:** ${ticketData.subject}\n**Usuário:** ${ticketData.user_name} (${ticketData.user_email})\n**Mensagem:** ${ticketData.message}`,
        embeds: [{
          title: `Ticket: ${ticketData.subject}`,
          description: ticketData.message,
          color: 2450411, // Azul
          fields: [
            { name: "Usuário", value: ticketData.user_name || "N/A", inline: true },
            { name: "Email", value: ticketData.user_email || "N/A", inline: true },
            { name: "Empresa ID", value: ticketData.company_id || "N/A", inline: true }
          ]
        }]
      });
    } catch (error) {
      console.error("Erro ao enviar notificação de webhook:", error);
    }
  }
};
