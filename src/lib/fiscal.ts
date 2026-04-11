/**
 * Fiscal Library for PowerControl ERP
 * Handles tax calculations and CFOP determination
 */

export interface TaxConfig {
  icms_rate: number;
  ipi_rate: number;
  pis_rate: number;
  cofins_rate: number;
  iss_rate: number;
  mva_rate?: number;
  aliquota_interna_destino?: number;
  csosn?: string; // Simples Nacional
  cst?: string; // Regime Normal
  ncm?: string;
  cest?: string;
}

export interface FiscalOperation {
  type: 'sale' | 'purchase' | 'return' | 'transfer';
  origin_state: string;
  dest_state: string;
  is_consumer: boolean;
  is_contributor: boolean;
  regime: 'simples' | 'normal';
  finality: 'revenda' | 'industrializacao' | 'consumo';
}

export const fiscal = {
  /**
   * Determines the CFOP based on operation details
   */
  getCFOP(operation: FiscalOperation, productType: 'product' | 'service', hasST: boolean = false): string {
    const isInsideState = operation.origin_state === operation.dest_state;
    const isInternational = operation.dest_state === 'EX';

    if (productType === 'service') {
      return isInsideState ? '5933' : '6933';
    }

    const prefix = isInternational ? '7' : (!isInsideState ? '6' : '5');

    if (operation.type === 'sale') {
      if (hasST) {
        return prefix === '5' ? '5405' : '6403';
      }
      if (operation.finality === 'industrializacao') return prefix + '101';
      return prefix + '102';
    }

    if (operation.type === 'purchase') {
      const pPrefix = isInternational ? '3' : (!isInsideState ? '2' : '1');
      if (operation.finality === 'consumo') return pPrefix + '556';
      if (operation.finality === 'industrializacao') return pPrefix + '101';
      return pPrefix + '102';
    }

    if (operation.type === 'return') {
      return prefix + '202';
    }

    return prefix + '949';
  },

  /**
   * Calculates taxes for a given value and configuration
   */
  calculateTaxes(value: number, config: TaxConfig, operation: FiscalOperation) {
    const isInsideState = operation.origin_state === operation.dest_state;
    
    // 1. IPI (Calculated first as it can compose ICMS base)
    // IPI base usually includes freight and other expenses, but for simplicity we use 'value'
    const ipiBase = value;
    const ipi = ipiBase * (config.ipi_rate / 100);
    
    // 2. ICMS Próprio
    // For Simples Nacional, ICMS is often 0 in the invoice (calculated in DAS), 
    // but for Normal regime it's calculated on (Value + IPI if finality is consumption)
    const icmsBase = (operation.finality === 'consumo' || operation.finality === 'industrializacao') ? (value + ipi) : value;
    const icms = icmsBase * (config.icms_rate / 100);
    
    // 3. ICMS-ST (Substituição Tributária)
    let icmsST = 0;
    let baseST = 0;
    if (config.mva_rate && config.mva_rate > 0) {
      // Base ST = (Valor + IPI + Outras Despesas - Descontos) * (1 + MVA)
      // Note: IPI is included in Base ST even if it's not included in ICMS Próprio base
      baseST = (value + ipi) * (1 + config.mva_rate / 100);
      const internalRate = config.aliquota_interna_destino || 18;
      const icmsSTBruto = baseST * (internalRate / 100);
      
      // ICMS ST = (Base ST * Alíquota Interna) - ICMS Próprio
      icmsST = Math.max(0, icmsSTBruto - icms);
    }
    
    // 4. DIFAL (Diferencial de Alíquota) - EC 87/2015
    // Only for interstate sales to non-contributor consumers
    let difal = 0;
    let difal_dest = 0;
    let difal_orig = 0;
    
    if (!isInsideState && operation.is_consumer && !operation.is_contributor) {
      const internalRate = config.aliquota_interna_destino || 18;
      const interstateRate = config.icms_rate; // Usually 4%, 7% or 12%
      const diffRate = internalRate - interstateRate;
      
      if (diffRate > 0) {
        difal = value * (diffRate / 100);
        // Since 2019, 100% of DIFAL goes to the destination state
        difal_dest = difal;
        difal_orig = 0;
      }
    }

    const pis = value * (config.pis_rate / 100);
    const cofins = value * (config.cofins_rate / 100);
    const iss = value * (config.iss_rate / 100);

    return {
      icms,
      icms_base: icmsBase,
      icms_st: icmsST,
      base_st: baseST,
      difal,
      difal_dest,
      difal_orig,
      ipi,
      ipi_base: ipiBase,
      pis,
      cofins,
      iss,
      total_taxes: icms + icmsST + difal + ipi + pis + cofins + iss,
      total_value: value + ipi + icmsST // Total to be paid by client (Commercial value + IPI + ST)
    };
  },

  /**
   * Validates NCM (Nomenclatura Comum do Mercosul) format
   */
  isValidNCM(ncm: string): boolean {
    return /^\d{8}$/.test(ncm.replace(/\D/g, ''));
  },

  /**
   * Formats NCM for display
   */
  formatNCM(ncm: string): string {
    const cleaned = ncm.replace(/\D/g, '');
    if (cleaned.length !== 8) return ncm;
    return `${cleaned.substring(0, 4)}.${cleaned.substring(4, 6)}.${cleaned.substring(6, 8)}`;
  }
};
