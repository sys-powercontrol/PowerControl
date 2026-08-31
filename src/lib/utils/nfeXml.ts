/**
 * Robust Brazilian NF-e / NFC-e / CT-e / MDF-e XML parser
 * Handles encodings (UTF-8, ISO-8859-1, Windows-1252), BOMs, unescaped characters,
 * namespaced DOM trees, and regex fallbacks.
 */

export interface ParsedNFeSupplier {
  name: string;
  tradeName?: string;
  cnpj: string;
  phone?: string;
  ie?: string;
  address_street?: string;
  address_number?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  isNew?: boolean;
}

export interface ParsedNFeInvoiceInfo {
  number: string;
  series: string;
  date: string;
  accessKey?: string;
  natureOfOperation?: string;
  totalValue?: number;
}

export interface ParsedNFeItem {
  code: string;
  ean: string;
  name: string;
  ncm: string;
  cfop: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  discount?: number;
  otherExpenses?: number;
  freight?: number;
  linkedProductId?: string;
  linkedProductName?: string;
  storageLocation?: string;
  isNewProduct?: boolean;
}

export interface ParsedNFeDuplicate {
  number: string;
  dueDate: string;
  amount: number;
}

export interface ParsedNFeResult {
  supplier: ParsedNFeSupplier | null;
  invoice: ParsedNFeInvoiceInfo;
  items: ParsedNFeItem[];
  duplicates: ParsedNFeDuplicate[];
}

/**
 * Reads a File object and returns decoded text with proper encoding handling (UTF-8 / ISO-8859-1)
 */
export async function readXmlFileAsText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Check for UTF-8 Byte Order Mark (BOM)
  let offset = 0;
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    offset = 3;
  }

  // Quick scan for encoding declaration in first 200 bytes
  let initialSample = "";
  for (let i = offset; i < Math.min(bytes.length, offset + 300); i++) {
    initialSample += String.fromCharCode(bytes[i]);
  }

  const isIsoEncoding = /encoding=["'](ISO-8859-1|windows-1252|latin1)["']/i.test(initialSample);

  let text: string;
  if (isIsoEncoding) {
    try {
      const decoder = new TextDecoder("iso-8859-1");
      text = decoder.decode(bytes.subarray(offset));
    } catch {
      const decoder = new TextDecoder("utf-8");
      text = decoder.decode(bytes.subarray(offset));
    }
  } else {
    try {
      const decoder = new TextDecoder("utf-8");
      text = decoder.decode(bytes.subarray(offset));
      // If there are replacement characters and it might be ISO-8859-1, try fallback
      if (text.includes("\uFFFD") && (text.includes("encoding=\"") || text.includes("encoding='"))) {
        const isoDecoder = new TextDecoder("iso-8859-1");
        text = isoDecoder.decode(bytes.subarray(offset));
      }
    } catch {
      const isoDecoder = new TextDecoder("iso-8859-1");
      text = isoDecoder.decode(bytes.subarray(offset));
    }
  }

  return text;
}

/**
 * Sanitizes XML text before passing to DOMParser
 */
export function sanitizeXmlString(xml: string): string {
  if (!xml) return "";

  let cleaned = xml
    // Strip BOM character if present
    .replace(/^\uFEFF/, "")
    // Remove invalid XML control characters except \t, \n, \r
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();

  // Escape lone & that are not standard XML entities
  cleaned = cleaned.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;");

  return cleaned;
}

/**
 * Helper to get tag text safely from an Element or Document
 */
function getTagText(parent: Element | Document | null, tagName: string): string {
  if (!parent) return "";

  // 1. Try getElementsByTagName (ignores namespaces and is standard)
  const byTag = parent.getElementsByTagName(tagName);
  if (byTag.length > 0 && byTag[0].textContent) {
    return byTag[0].textContent.trim();
  }

  // 2. Try querySelector
  try {
    const el = parent.querySelector(tagName);
    if (el && el.textContent) {
      return el.textContent.trim();
    }
  } catch {
    // ignore querySelector error with special characters
  }

  // 3. Try lowercase / uppercase variation
  const allNodes = parent.children || (parent as any).childNodes;
  if (allNodes) {
    for (let i = 0; i < allNodes.length; i++) {
      const node = allNodes[i];
      if (node.nodeType === 1) { // ELEMENT_NODE
        const localName = (node as Element).localName || (node as Element).tagName;
        if (localName && localName.toLowerCase() === tagName.toLowerCase()) {
          return (node.textContent || "").trim();
        }
      }
    }
  }

  return "";
}

/**
 * Helper to get child element safely
 */
function getChildElement(parent: Element | Document | null, tagName: string): Element | null {
  if (!parent) return null;

  const byTag = parent.getElementsByTagName(tagName);
  if (byTag.length > 0) {
    return byTag[0];
  }

  try {
    const el = parent.querySelector(tagName);
    if (el) return el;
  } catch {
    // ignore
  }

  return null;
}

/**
 * Helper to get all child elements by tag name safely
 */
function getChildElements(parent: Element | Document | null, tagName: string): Element[] {
  if (!parent) return [];

  const byTag = parent.getElementsByTagName(tagName);
  if (byTag.length > 0) {
    return Array.from(byTag);
  }

  try {
    const els = parent.querySelectorAll(tagName);
    if (els.length > 0) {
      return Array.from(els);
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Fallback Regex-based parser if DOMParser fails completely
 */
function parseNFeWithRegex(xml: string): ParsedNFeResult {
  const getRegexValue = (str: string, tag: string): string => {
    const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(str);
    return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
  };

  // Supplier
  const emitMatch = /<emit[^>]*>([\s\S]*?)<\/emit>/i.exec(xml);
  const emitStr = emitMatch ? emitMatch[1] : "";
  const cnpj = getRegexValue(emitStr, "CNPJ") || getRegexValue(emitStr, "CPF");
  const name = getRegexValue(emitStr, "xNome");
  const tradeName = getRegexValue(emitStr, "xFant");
  const phone = getRegexValue(emitStr, "fone");
  const ie = getRegexValue(emitStr, "IE");
  const state = getRegexValue(emitStr, "UF");
  const city = getRegexValue(emitStr, "xMun");
  const street = getRegexValue(emitStr, "xLgr");
  const number = getRegexValue(emitStr, "nro");
  const neighborhood = getRegexValue(emitStr, "xBairro");
  const zip = getRegexValue(emitStr, "CEP");

  const supplier: ParsedNFeSupplier | null = name || cnpj ? {
    name: tradeName || name,
    tradeName: tradeName || undefined,
    cnpj: cnpj.replace(/\D/g, ""),
    phone,
    ie,
    address_street: street,
    address_number: number,
    address_neighborhood: neighborhood,
    address_city: city,
    address_state: state,
    address_zip: zip,
    isNew: true
  } : null;

  // Invoice
  const ideMatch = /<ide[^>]*>([\s\S]*?)<\/ide>/i.exec(xml);
  const ideStr = ideMatch ? ideMatch[1] : "";
  const invNumber = getRegexValue(ideStr, "nNF");
  const invSeries = getRegexValue(ideStr, "serie") || "1";
  const invDate = getRegexValue(ideStr, "dhEmi") || getRegexValue(ideStr, "dEmi") || new Date().toISOString();
  const natOp = getRegexValue(ideStr, "natOp");

  // Access key
  const infNFeMatch = /<infNFe[^>]*Id=["'](NFe)?(\d{44})["']/i.exec(xml);
  const accessKey = infNFeMatch ? infNFeMatch[2] : getRegexValue(xml, "chNFe");

  // Duplicates
  const duplicates: ParsedNFeDuplicate[] = [];
  const dupRegex = /<dup[^>]*>([\s\S]*?)<\/dup>/gi;
  let dupMatch: RegExpExecArray | null;
  let dupIndex = 1;
  while ((dupMatch = dupRegex.exec(xml)) !== null) {
    const dStr = dupMatch[1];
    const nDup = getRegexValue(dStr, "nDup") || `${dupIndex}`;
    const dVenc = getRegexValue(dStr, "dVenc");
    const vDup = parseFloat(getRegexValue(dStr, "vDup") || "0");
    if (!isNaN(vDup) && vDup > 0) {
      duplicates.push({
        number: nDup,
        dueDate: dVenc,
        amount: vDup
      });
    }
    dupIndex++;
  }

  // Items
  const items: ParsedNFeItem[] = [];
  const detRegex = /<det[^>]*>([\s\S]*?)<\/det>/gi;
  let detMatch: RegExpExecArray | null;
  while ((detMatch = detRegex.exec(xml)) !== null) {
    const detStr = detMatch[1];
    const prodMatch = /<prod[^>]*>([\s\S]*?)<\/prod>/i.exec(detStr);
    const prodStr = prodMatch ? prodMatch[1] : detStr;

    const cProd = getRegexValue(prodStr, "cProd");
    let cEAN = getRegexValue(prodStr, "cEAN");
    if (cEAN === "SEM GTIN" || cEAN === "sem gtin") cEAN = "";
    const xProd = getRegexValue(prodStr, "xProd");
    const ncm = getRegexValue(prodStr, "NCM");
    const cfop = getRegexValue(prodStr, "CFOP");
    const uCom = getRegexValue(prodStr, "uCom") || "UN";
    const qCom = parseFloat(getRegexValue(prodStr, "qCom") || "1");
    const vUnCom = parseFloat(getRegexValue(prodStr, "vUnCom") || "0");
    const vProd = parseFloat(getRegexValue(prodStr, "vProd") || "0");

    if (xProd || cProd) {
      items.push({
        code: cProd || `${items.length + 1}`,
        ean: cEAN,
        name: xProd || `Item ${items.length + 1}`,
        ncm,
        cfop,
        unit: uCom,
        quantity: isNaN(qCom) || qCom <= 0 ? 1 : qCom,
        unitCost: isNaN(vUnCom) ? 0 : vUnCom,
        totalCost: isNaN(vProd) ? (isNaN(vUnCom) ? 0 : vUnCom * (isNaN(qCom) ? 1 : qCom)) : vProd
      });
    }
  }

  return {
    supplier,
    invoice: {
      number: invNumber,
      series: invSeries,
      date: invDate,
      accessKey,
      natureOfOperation: natOp
    },
    items,
    duplicates
  };
}

/**
 * Main function to parse NF-e XML text into structured data
 */
export function parseNFeXml(xmlText: string): ParsedNFeResult {
  const sanitized = sanitizeXmlString(xmlText);
  if (!sanitized) {
    throw new Error("Arquivo XML vazio ou corrompido.");
  }

  let xmlDoc: Document | null;

  try {
    const parser = new DOMParser();
    // Try text/xml first
    xmlDoc = parser.parseFromString(sanitized, "text/xml");
    
    // Check for parse errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      // Try stripping namespaces
      const strippedXml = sanitized.replace(/xmlns(:[a-zA-Z0-9_-]+)?="[^"]*"/g, "");
      xmlDoc = parser.parseFromString(strippedXml, "text/xml");
    }
  } catch {
    xmlDoc = null;
  }

  // If DOMParser failed or returned a parsererror, use regex fallback
  if (!xmlDoc || xmlDoc.querySelector("parsererror")) {
    const regexResult = parseNFeWithRegex(sanitized);
    if (regexResult.items.length > 0 || regexResult.supplier) {
      return regexResult;
    }
    throw new Error("Erro ao ler arquivo XML: estrutura da NF-e não reconhecida.");
  }

  // DOM Parsing
  // 1. Supplier
  const emitNode = getChildElement(xmlDoc, "emit");
  let supplier: ParsedNFeSupplier | null = null;
  if (emitNode) {
    const cnpj = getTagText(emitNode, "CNPJ") || getTagText(emitNode, "CPF");
    const name = getTagText(emitNode, "xNome");
    const tradeName = getTagText(emitNode, "xFant");
    const phone = getTagText(emitNode, "fone");
    const ie = getTagText(emitNode, "IE");

    const enderEmit = getChildElement(emitNode, "enderEmit");
    const state = getTagText(enderEmit || emitNode, "UF");
    const city = getTagText(enderEmit || emitNode, "xMun");
    const street = getTagText(enderEmit || emitNode, "xLgr");
    const number = getTagText(enderEmit || emitNode, "nro");
    const neighborhood = getTagText(enderEmit || emitNode, "xBairro");
    const zip = getTagText(enderEmit || emitNode, "CEP");

    supplier = {
      name: tradeName || name || "Fornecedor sem nome",
      tradeName: tradeName || undefined,
      cnpj: cnpj.replace(/\D/g, ""),
      phone,
      ie,
      address_street: street,
      address_number: number,
      address_neighborhood: neighborhood,
      address_city: city,
      address_state: state,
      address_zip: zip,
      isNew: true
    };
  }

  // 2. Invoice Info
  const ideNode = getChildElement(xmlDoc, "ide");
  const invNumber = getTagText(ideNode, "nNF");
  const invSeries = getTagText(ideNode, "serie") || "1";
  const invDate = getTagText(ideNode, "dhEmi") || getTagText(ideNode, "dEmi") || new Date().toISOString();
  const natOp = getTagText(ideNode, "natOp");

  // Access key
  const infNFe = getChildElement(xmlDoc, "infNFe");
  const accessKey = (infNFe && infNFe.getAttribute("Id"))
    ? (infNFe.getAttribute("Id") || "").replace(/^NFe/i, "")
    : getTagText(xmlDoc, "chNFe");

  // Total value
  const totalNode = getChildElement(xmlDoc, "ICMSTot") || getChildElement(xmlDoc, "total");
  const totalValue = parseFloat(getTagText(totalNode, "vNF") || "0");

  // 3. Duplicates / Payments
  const dupNodes = getChildElements(xmlDoc, "dup");
  const duplicates: ParsedNFeDuplicate[] = [];

  dupNodes.forEach((dup, idx) => {
    const nDup = getTagText(dup, "nDup") || `${idx + 1}`;
    const dVenc = getTagText(dup, "dVenc");
    const vDup = parseFloat(getTagText(dup, "vDup") || "0");
    if (!isNaN(vDup) && vDup > 0) {
      duplicates.push({
        number: nDup,
        dueDate: dVenc,
        amount: vDup
      });
    }
  });

  // If no <dup>, check <detPag>
  if (duplicates.length === 0) {
    const detPagNodes = getChildElements(xmlDoc, "detPag");
    detPagNodes.forEach((pag, idx) => {
      const vPag = parseFloat(getTagText(pag, "vPag") || "0");
      if (!isNaN(vPag) && vPag > 0) {
        duplicates.push({
          number: `${idx + 1}`,
          dueDate: invDate ? invDate.split("T")[0] : new Date().toISOString().split("T")[0],
          amount: vPag
        });
      }
    });
  }

  // 4. Products / Items
  const detNodes = getChildElements(xmlDoc, "det");
  const items: ParsedNFeItem[] = [];

  detNodes.forEach((det, idx) => {
    const prod = getChildElement(det, "prod");
    if (!prod) return;

    const cProd = getTagText(prod, "cProd") || `${idx + 1}`;
    let cEAN = getTagText(prod, "cEAN");
    if (cEAN === "SEM GTIN" || cEAN === "sem gtin") cEAN = "";
    const xProd = getTagText(prod, "xProd") || `Item ${idx + 1}`;
    const ncm = getTagText(prod, "NCM");
    const cfop = getTagText(prod, "CFOP");
    const uCom = getTagText(prod, "uCom") || "UN";
    const qCom = parseFloat(getTagText(prod, "qCom") || "1");
    const vUnCom = parseFloat(getTagText(prod, "vUnCom") || "0");
    const vProd = parseFloat(getTagText(prod, "vProd") || "0");
    const vDesc = parseFloat(getTagText(prod, "vDesc") || "0");
    const vFrete = parseFloat(getTagText(prod, "vFrete") || "0");
    const vOutro = parseFloat(getTagText(prod, "vOutro") || "0");

    items.push({
      code: cProd,
      ean: cEAN,
      name: xProd,
      ncm,
      cfop,
      unit: uCom,
      quantity: isNaN(qCom) || qCom <= 0 ? 1 : qCom,
      unitCost: isNaN(vUnCom) ? 0 : vUnCom,
      totalCost: isNaN(vProd) ? (isNaN(vUnCom) ? 0 : vUnCom * (isNaN(qCom) ? 1 : qCom)) : vProd,
      discount: isNaN(vDesc) ? 0 : vDesc,
      freight: isNaN(vFrete) ? 0 : vFrete,
      otherExpenses: isNaN(vOutro) ? 0 : vOutro
    });
  });

  // If DOM parsing got 0 items, fallback to regex
  if (items.length === 0) {
    const regexFallback = parseNFeWithRegex(sanitized);
    if (regexFallback.items.length > 0) {
      return regexFallback;
    }
  }

  return {
    supplier,
    invoice: {
      number: invNumber,
      series: invSeries,
      date: invDate,
      accessKey,
      natureOfOperation: natOp,
      totalValue: isNaN(totalValue) ? undefined : totalValue
    },
    items,
    duplicates
  };
}
