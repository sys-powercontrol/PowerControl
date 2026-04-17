import axios from "axios";

export const notificationApi = {
  async sendSupportWebhook(ticketData: any) {
    const webhookUrl = import.meta.env.VITE_SUPPORT_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn("VITE_SUPPORT_WEBHOOK_URL não configurada. Notificação ignorada.");
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
