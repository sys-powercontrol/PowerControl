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
  atividade_principal: { code: string; text: string }[];
}

export const externalApi = {
  async fetchCEP(cep: string): Promise<ViaCEPResponse> {
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length !== 8) {
      throw new Error("CEP inválido");
    }
    const response = await axios.get<ViaCEPResponse>(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    if (response.data.erro) {
      throw new Error("CEP não encontrado");
    }
    return response.data;
  },

  async fetchCNPJ(cnpj: string): Promise<ReceitaWSResponse> {
    const cleanCNPJ = cnpj.replace(/\D/g, "");
    if (cleanCNPJ.length !== 14) {
      throw new Error("CNPJ inválido");
    }
    
    // ReceitaWS free tier has CORS issues when called from browser.
    // Using a CORS proxy or JSONP is often needed, but for this environment,
    // we'll try direct call first. If it fails, we might need a different approach.
    // Note: ReceitaWS free tier limit is 3 requests per minute.
    try {
      const response = await axios.get<ReceitaWSResponse>(`https://receitaws.com.br/v1/cnpj/${cleanCNPJ}`);
      if (response.data.status === "ERROR") {
        throw new Error(response.data.message || "CNPJ não encontrado");
      }
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error("Limite de requisições excedido. Tente novamente em um minuto.");
      }
      throw new Error("Erro ao consultar CNPJ. Verifique sua conexão ou tente novamente mais tarde.");
    }
  }
};
