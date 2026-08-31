import axios from "axios";

export interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

export interface ReceitaWSResponse {
  status: string;
  message?: string;
  nome: string;
  fantasia: string;
  cnpj: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  email: string;
  telefone: string;
  cnae?: string;
  atividade_principal: { code: string; text: string }[];
}

function formatPhone(phoneStr?: string): string {
  if (!phoneStr) return "";
  const clean = phoneStr.replace(/\D/g, "");
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phoneStr;
}

export const externalApi = {
  async fetchCEP(cep: string): Promise<ViaCEPResponse> {
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length !== 8) {
      throw new Error("CEP inválido. Digite os 8 dígitos.");
    }
    try {
      const response = await axios.get<ViaCEPResponse>(`https://viacep.com.br/ws/${cleanCEP}/json/`, { timeout: 8000 });
      if (response.data.erro) {
        throw new Error("CEP não encontrado");
      }
      return response.data;
    } catch (err: any) {
      // Fallback to BrasilAPI CEP
      try {
        const bRes = await axios.get(`https://brasilapi.com.br/api/cep/v1/${cleanCEP}`, { timeout: 8000 });
        if (bRes.data) {
          return {
            cep: bRes.data.cep || cleanCEP,
            logradouro: bRes.data.street || "",
            complemento: "",
            bairro: bRes.data.neighborhood || "",
            localidade: bRes.data.city || "",
            uf: bRes.data.state || "",
            ibge: "",
            gia: "",
            ddd: "",
            siafi: ""
          };
        }
      } catch (bErr) {
        console.warn("Fallback CEP failed:", bErr);
      }
      if (err.message === "CEP não encontrado") throw err;
      throw new Error("Erro ao consultar CEP. Verifique o número digitado.", { cause: err });
    }
  },

  async fetchCNPJ(cnpj: string): Promise<ReceitaWSResponse> {
    const cleanCNPJ = cnpj.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) {
      throw new Error("CNPJ inválido. Digite os 14 números.");
    }
    
    // 1. Tenta BrasilAPI (suporta CORS nativo, ultra-rápida, dados completos da Receita Federal)
    try {
      const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`, { timeout: 9000 });
      const data = response.data;
      if (data && (data.razao_social || data.nome_fantasia || data.cnpj)) {
        const fullStreet = [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(" ").trim() || data.logradouro || "";
        const cnaeCode = data.cnae_fiscal ? String(data.cnae_fiscal) : "";
        const cnaeText = data.cnae_fiscal_descricao || "";

        return {
          status: "OK",
          nome: data.razao_social || data.nome_fantasia || "",
          fantasia: data.nome_fantasia || data.razao_social || "",
          cnpj: data.cnpj || cleanCNPJ,
          logradouro: fullStreet,
          numero: data.numero || "",
          complemento: data.complemento || "",
          bairro: data.bairro || "",
          municipio: data.municipio || "",
          uf: data.uf || "",
          cep: data.cep ? String(data.cep).replace(/\D/g, "") : "",
          email: (data.email || "").toLowerCase(),
          telefone: formatPhone(data.ddd_telefone_1 || data.ddd_telefone_2 || ""),
          cnae: cnaeCode,
          atividade_principal: cnaeCode ? [{ code: cnaeCode, text: cnaeText }] : []
        };
      }
    } catch (err: any) {
      console.warn("BrasilAPI CNPJ lookup failed, trying MinhaReceita fallback...", err?.message);
    }

    // 2. Fallback: MinhaReceita API (CORS liberado, espelho público da base da Receita Federal)
    try {
      const response = await axios.get(`https://minhareceita.org/${cleanCNPJ}`, { timeout: 9000 });
      const data = response.data;
      if (data && (data.razao_social || data.nome_fantasia || data.cnpj)) {
        const fullStreet = [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(" ").trim() || data.logradouro || "";
        const cnaeCode = data.cnae_fiscal ? String(data.cnae_fiscal) : "";
        const cnaeText = data.cnae_fiscal_descricao || "";

        return {
          status: "OK",
          nome: data.razao_social || data.nome_fantasia || "",
          fantasia: data.nome_fantasia || data.razao_social || "",
          cnpj: data.cnpj || cleanCNPJ,
          logradouro: fullStreet,
          numero: data.numero || "",
          complemento: data.complemento || "",
          bairro: data.bairro || "",
          municipio: data.municipio || "",
          uf: data.uf || "",
          cep: data.cep ? String(data.cep).replace(/\D/g, "") : "",
          email: (data.email || "").toLowerCase(),
          telefone: formatPhone(data.ddd_telefone_1 || data.ddd_telefone_2 || ""),
          cnae: cnaeCode,
          atividade_principal: cnaeCode ? [{ code: cnaeCode, text: cnaeText }] : []
        };
      }
    } catch (err: any) {
      console.warn("MinhaReceita lookup failed, trying ReceitaWS fallback...", err?.message);
    }

    // 3. Fallback: ReceitaWS via proxy de consulta
    try {
      const response = await axios.get<ReceitaWSResponse>(`https://receitaws.com.br/v1/cnpj/${cleanCNPJ}`, { timeout: 8000 });
      if (response.data.status === "ERROR") {
        throw new Error(response.data.message || "CNPJ não encontrado na Receita Federal");
      }
      return response.data;
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        throw new Error("Limite de consultas excedido. Aguarde alguns instantes e tente novamente.", { cause: err });
      }
      if (err.response?.status === 404 || err.message?.includes("não encontrado")) {
        throw new Error("CNPJ não encontrado na base de dados da Receita Federal.", { cause: err });
      }
      throw new Error("Não foi possível consultar os dados do CNPJ no momento. Verifique o número ou preencha manualmente.", { cause: err });
    }
  }
};

