import axios from "axios";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";

export interface FiscalConfig {
  token: string;
  environment: "sandbox" | "production";
  provider: "FocusNFe" | "WebmaniaBR";
}

export interface FiscalInvoiceData {
  sale_id: string;
  type: "NFe" | "NFCe";
  client: any;
  items: any[];
  total: number;
  company: any;
}

const FOCUSNFE_URLS = {
  sandbox: "https://homologacao.focusnfe.com.br/v2",
  production: "https://api.focusnfe.com.br/v2"
};

export const fiscalApi = {
  emit: async (config: FiscalConfig, data: FiscalInvoiceData) => {
    if (config.provider === "FocusNFe") {
      return emitFocusNFe(config, data);
    }
    throw new Error("Provedor fiscal não suportado");
  },

  checkStatus: async (config: FiscalConfig, reference: string, type: "NFe" | "NFCe") => {
    if (config.provider === "FocusNFe") {
      return checkFocusNFeStatus(config, reference, type);
    }
    throw new Error("Provedor fiscal não suportado");
  },

  cancel: async (config: FiscalConfig, reference: string, reason: string) => {
    if (config.provider === "FocusNFe") {
      return cancelFocusNFe(config, reference, reason);
    }
    throw new Error("Provedor fiscal não suportado");
  },

  saveXmlToStorage: async (companyId: string, accessKey: string, xmlUrl: string) => {
    try {
      // 1. Fetch XML content
      const response = await axios.get(xmlUrl, { responseType: 'text' });
      const xmlContent = response.data;

      // 2. Define path: invoices/{company_id}/{year}/{month}/{key}.xml
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const path = `invoices/${companyId}/${year}/${month}/${accessKey}.xml`;

      // 3. Upload to Firebase Storage
      const storageRef = ref(storage, path);
      await uploadString(storageRef, xmlContent, 'raw', {
        contentType: 'application/xml'
      });

      // 4. Get Download URL
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Error saving XML to storage:", error);
      throw error;
    }
  }
};

async function emitFocusNFe(config: FiscalConfig, data: FiscalInvoiceData) {
  const baseUrl = FOCUSNFE_URLS[config.environment];
  const endpoint = data.type === "NFe" ? "/nfe" : "/nfce";
  const reference = `${data.sale_id}_${Date.now()}`;

  // Mapping Sale to FocusNFe format
  const payload = {
    natureza_operacao: "Venda de mercadoria",
    data_emissao: new Date().toISOString(),
    tipo_documento: 1, // 1 = Saída
    finalidade_emissao: 1, // 1 = Normal
    cnpj_emitente: data.company.document?.replace(/\D/g, ""),
    nome_emitente: data.company.name,
    logradouro_emitente: data.company.address || "Rua Principal",
    numero_emitente: "123",
    bairro_emitente: "Centro",
    municipio_emitente: "Sao Paulo",
    uf_emitente: "SP",
    cep_emitente: "01001000",
    inscricao_estadual_emitente: data.company.ie || "123456789",
    regime_tributario_emitente: parseInt(data.company.regime_tributario || "1"),

    nome_destinatario: data.client.name,
    cpf_destinatario: data.client.document?.replace(/\D/g, ""),
    inscricao_estadual_destinatario: "",
    logradouro_destinatario: data.client.address || "Rua Destino",
    numero_destinatario: "1",
    bairro_destinatario: "Bairro",
    municipio_destinatario: "Sao Paulo",
    uf_destinatario: "SP",
    cep_destinatario: "01001000",

    items: data.items.map((item, index) => ({
      numero_item: index + 1,
      codigo_produto: item.id,
      descricao: item.name,
      ncm: item.ncm || "00000000",
      cfop: item.cfop || "5102",
      unidade_comercial: "UN",
      quantidade_comercial: item.quantity,
      valor_unitario_comercial: item.sale_price,
      valor_bruto: item.sale_price * item.quantity,
      icms_situacao_tributaria: item.csosn || item.cst || "102",
      icms_origem: 0,
      pis_situacao_tributaria: "07",
      cofins_situacao_tributaria: "07",
      ipi_aliquota: item.ipi_rate,
      icms_st_aliquota: item.mva_rate ? (item.aliquota_interna_destino || 18) : undefined,
      icms_st_mva: item.mva_rate,
      icms_st_base_calculo: item.taxes?.base_st,
      icms_st_valor: item.taxes?.icms_st,
      icms_valor_total_difal: item.taxes?.difal
    })),

    valor_total_bruto: data.total,
    valor_total_nota: data.total,
    modalidade_frete: 9 // 9 = Sem frete
  };

  try {
    const response = await axios.post(`${baseUrl}${endpoint}?ref=${reference}`, payload, {
      auth: {
        username: config.token,
        password: ""
      }
    });

    return {
      reference,
      status: response.data.status,
      message: response.data.mensagem,
      protocol: response.data.protocolo,
      access_key: response.data.chave_nfe
    };
  } catch (error: any) {
    console.error("FocusNFe Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.mensagem || "Erro ao comunicar com FocusNFe");
  }
}

async function checkFocusNFeStatus(config: FiscalConfig, reference: string, type: "NFe" | "NFCe") {
  const baseUrl = FOCUSNFE_URLS[config.environment];
  const endpoint = type === "NFe" ? "/nfe" : "/nfce";

  try {
    const response = await axios.get(`${baseUrl}${endpoint}/${reference}`, {
      auth: {
        username: config.token,
        password: ""
      }
    });

    return {
      status: response.data.status,
      protocol: response.data.protocolo,
      access_key: response.data.chave_nfe,
      xml_url: response.data.caminho_xml_nota_fiscal,
      pdf_url: response.data.caminho_danfe,
      error_message: response.data.mensagem_sefaz
    };
  } catch (error: any) {
    console.error("FocusNFe Status Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.mensagem || "Erro ao consultar status");
  }
}

async function cancelFocusNFe(config: FiscalConfig, reference: string, reason: string) {
  const baseUrl = FOCUSNFE_URLS[config.environment];

  try {
    const response = await axios.delete(`${baseUrl}/nfe/${reference}`, {
      auth: {
        username: config.token,
        password: ""
      },
      data: {
        justificativa: reason
      }
    });

    return {
      status: response.data.status,
      message: response.data.mensagem
    };
  } catch (error: any) {
    console.error("FocusNFe Cancel Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.mensagem || "Erro ao cancelar nota");
  }
}
