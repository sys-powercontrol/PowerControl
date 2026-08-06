export interface FooterLink {
  id: string;
  label: string;
  url: string;
  isExternal?: boolean;
}

export interface FooterConfig {
  system_name: string;
  tagline: string;
  system_version: string;
  copyright_text: string;
  support_email: string;
  support_phone: string;
  support_hours: string;
  status_badge_enabled: boolean;
  status_text: string;
  status_color: 'green' | 'yellow' | 'red' | 'blue';
  announcement_enabled: boolean;
  announcement_text: string;
  links: FooterLink[];
  website_url: string;
  whatsapp_number: string;
  instagram_handle: string;
  linkedin_url: string;
  show_version: boolean;
  show_contacts: boolean;
  show_links: boolean;
  show_social: boolean;
  show_status: boolean;
}

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  system_name: "PowerControl ERP",
  tagline: "Plataforma integrada de gestão empresarial, finanças e controle de vendas.",
  system_version: "v2.5.0",
  copyright_text: `© ${new Date().getFullYear()} PowerControl - Todos os direitos reservados.`,
  support_email: "suporte@powercontrol.com.br",
  support_phone: "(11) 99999-8888",
  support_hours: "Seg a Sex: 08:00 às 18:00",
  status_badge_enabled: true,
  status_text: "Sistemas 100% Operacionais",
  status_color: "green",
  announcement_enabled: false,
  announcement_text: "",
  links: [
    { id: "1", label: "Termos de Uso", url: "/TermosDeUso" },
    { id: "2", label: "Política de Privacidade", url: "/PoliticaPrivacidade" },
    { id: "3", label: "Central de Suporte", url: "/Suporte" }
  ],
  website_url: "",
  whatsapp_number: "5511999998888",
  instagram_handle: "",
  linkedin_url: "",
  show_version: true,
  show_contacts: true,
  show_links: true,
  show_social: true,
  show_status: true
};
