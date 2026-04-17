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

const WEBMANIABR_URLS = {
  sandbox: "https://webmaniabr.com/api/1/nfe",
  production: "https://webmaniabr.com/api/1/nfe"
};

export const fiscalApi = {
  emit: async (config: FiscalConfig, data: FiscalInvoiceData) => {
    if (config.provider === "FocusNFe") {
      return emitFocusNFe(config, data);
    }
    if (config.provider === "WebmaniaBR") {
      return emitWebmaniaBR(config, data);
    }
    throw new Error("Provedor fiscal não suportado");
  },

  checkStatus: async (config: FiscalConfig, reference: string, type: "NFe" | "NFCe") => {
    if (config.provider === "FocusNFe") {
      return checkFocusNFeStatus(config, reference, type);
    }
    if (config.provider === "WebmaniaBR") {
      return checkWebmaniaBRStatus(config, reference);
    }
    throw new Error("Provedor fiscal não suportado");
  },

  checkWebmaniaBRStatus: async (config: FiscalConfig, uuid: string) => {
    return checkWebmaniaBRStatus(config, uuid);
  },

  cancel: async (config: FiscalConfig, reference: string, reason: string) => {
    if (config.provider === "FocusNFe") {
      return cancelFocusNFe(config, reference, reason);
    }
    if (config.provider === "WebmaniaBR") {
      return cancelWebmaniaBR(config, reference, reason);
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
    cnpj_emitente: data.company.cnpj?.replace(/\D/g, ""),
    nome_emitente: data.company.name,
    logradouro_emitente: data.company.address || "Rua Principal",
    numero_emitente: data.company.address_number || "SN",
    bairro_emitente: data.company.neighborhood || "Centro",
    municipio_emitente: data.company.city || "Sao Paulo",
    uf_emitente: data.company.state || "SP",
    cep_emitente: data.company.zip_code?.replace(/\D/g, "") || "01001000",
    inscricao_estadual_emitente: data.company.ie || "123456789",
    regime_tributario_emitente: parseInt(data.company.regime_tributario || "1"),

    nome_destinatario: data.client.name,
    cpf_destinatario: (data.client.cpf || data.client.document)?.replace(/\D/g, "").length === 11 ? (data.client.cpf || data.client.document)?.replace(/\D/g, "") : undefined,
    cnpj_destinatario: (data.client.cpf || data.client.document)?.replace(/\D/g, "").length === 14 ? (data.client.cpf || data.client.document)?.replace(/\D/g, "") : undefined,
    inscricao_estadual_destinatario: data.client.ie || "",
    logradouro_destinatario: data.client.address || "Rua Destino",
    numero_destinatario: data.client.address_number || "SN",
    bairro_destinatario: data.client.neighborhood || "Bairro",
    municipio_destinatario: data.client.city || "Sao Paulo",
    uf_destinatario: data.client.state || "SP",
    cep_destinatario: data.client.zip_code?.replace(/\D/g, "") || "01001000",

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

async function emitWebmaniaBR(config: FiscalConfig, data: FiscalInvoiceData) {
  const baseUrl = WEBMANIABR_URLS[config.environment];
  const reference = `${data.sale_id}_${Date.now()}`;

  // WebmaniaBR uses a different structure
  // Documentation: https://webmaniabr.com/docs/rest-api-nfe/
  const payload = {
    ID: reference,
    operacao: 1, // 1 = Saída
    natureza_operacao: "Venda de mercadoria",
    modelo: data.type === "NFe" ? 1 : 2, // 1 = NFe, 2 = NFCe
    finalidade: 1, // 1 = Normal
    ambiente: config.environment === "sandbox" ? 2 : 1, // 1 = Produção, 2 = Homologação
    cliente: {
      cpf: (data.client.cpf || data.client.document)?.replace(/\D/g, "").length === 11 ? (data.client.cpf || data.client.document)?.replace(/\D/g, "") : undefined,
      cnpj: (data.client.cpf || data.client.document)?.replace(/\D/g, "").length === 14 ? (data.client.cpf || data.client.document)?.replace(/\D/g, "") : undefined,
      nome_completo: data.client.name,
      endereco: data.client.address,
      complemento: data.client.complement,
      numero: data.client.address_number,
      bairro: data.client.neighborhood,
      cidade: data.client.city,
      uf: data.client.state,
      cep: data.client.zip_code,
      telefone: data.client.phone,
      email: data.client.email
    },
    produtos: data.items.map(item => ({
      nome: item.name,
      codigo: item.sku || item.id,
      ncm: item.ncm || "00000000",
      cest: item.cest,
      quantidade: item.quantity,
      unidade: "UN",
      origem: 0,
      subtotal: item.sale_price,
      total: item.sale_price * item.quantity,
      classe_imposto: item.tax_class || "REF1234" // Placeholder or mapped from product
    })),
    pedido: {
      pagamento: 0, // 0 = Pagamento à vista
      presenca: 1, // 1 = Operação presencial
      modalidade_frete: 9 // 9 = Sem frete
    }
  };

  try {
    // WebmaniaBR usually requires Consumer Key, Consumer Secret, Access Token, Access Token Secret
    // If the user only provides one token, we might need to split it or handle it
    // For this implementation, we'll assume the token is "ConsumerKey:ConsumerSecret:AccessToken:AccessTokenSecret"
    const [ck, cs, at, ats] = config.token.split(":");

    const response = await axios.post(`${baseUrl}/emissao/`, payload, {
      headers: {
        "X-Consumer-Key": ck,
        "X-Consumer-Secret": cs,
        "X-AccessToken": at,
        "X-AccessToken-Secret": ats,
        "Content-Type": "application/json"
      }
    });

    return {
      reference: response.data.uuid || reference,
      status: response.data.status === "success" ? "processando" : "erro",
      message: response.data.error || response.data.status,
      protocol: response.data.uuid,
      access_key: response.data.chave
    };
  } catch (error: any) {
    console.error("WebmaniaBR Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "Erro ao comunicar com WebmaniaBR");
  }
}

async function checkWebmaniaBRStatus(config: FiscalConfig, uuid: string) {
  const baseUrl = WEBMANIABR_URLS[config.environment];
  const [ck, cs, at, ats] = config.token.split(":");

  try {
    const response = await axios.get(`${baseUrl}/consulta/?uuid=${uuid}`, {
      headers: {
        "X-Consumer-Key": ck,
        "X-Consumer-Secret": cs,
        "X-AccessToken": at,
        "X-AccessToken-Secret": ats
      }
    });

    const status = response.data.status;
    let mappedStatus = "pendente";
    if (status === "aprovado") mappedStatus = "autorizado";
    if (status === "reprovado") mappedStatus = "erro_autorizacao";
    if (status === "cancelado") mappedStatus = "cancelado";

    return {
      status: mappedStatus,
      protocol: response.data.nfe,
      access_key: response.data.chave,
      xml_url: response.data.xml,
      pdf_url: response.data.danfe,
      error_message: response.data.motivo
    };
  } catch (error: any) {
    console.error("WebmaniaBR Status Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "Erro ao consultar status na WebmaniaBR");
  }
}

async function cancelWebmaniaBR(config: FiscalConfig, uuid: string, reason: string) {
  const baseUrl = WEBMANIABR_URLS[config.environment];
  const [ck, cs, at, ats] = config.token.split(":");

  try {
    const response = await axios.put(`${baseUrl}/cancelar/`, {
      uuid: uuid,
      justificativa: reason
    }, {
      headers: {
        "X-Consumer-Key": ck,
        "X-Consumer-Secret": cs,
        "X-AccessToken": at,
        "X-AccessToken-Secret": ats
      }
    });

    return {
      status: response.data.status === "success" ? "cancelado" : "erro",
      message: response.data.error || response.data.status
    };
  } catch (error: any) {
    console.error("WebmaniaBR Cancel Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error || "Erro ao cancelar na WebmaniaBR");
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
