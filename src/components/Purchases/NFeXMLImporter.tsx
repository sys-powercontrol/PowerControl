import React, { useState, useRef } from "react";
import { Upload, FileCode, CheckCircle, X, Search, Warehouse, Receipt } from "lucide-react";
import { formatCurrency } from "../../lib/currencyUtils";
import { toast } from "sonner";
import { api } from "../../lib/api";

interface NFeItemParsed {
  code: string;
  ean: string;
  name: string;
  ncm: string;
  cfop: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  linkedProductId?: string;
  linkedProductName?: string;
  storageLocation?: string;
  isNewProduct?: boolean;
}

interface NFeDuplicateParsed {
  number: string;
  dueDate: string;
  amount: number;
}

interface NFeXMLImporterProps {
  products: any[];
  suppliers: any[];
  currentCompanyId: string;
  onImportComplete: (data: {
    supplier: any;
    items: any[];
    invoiceNumber: string;
    series: string;
    duplicates?: NFeDuplicateParsed[];
  }) => void;
  onClose: () => void;
}

export function NFeXMLImporter({
  products,
  suppliers,
  currentCompanyId,
  onImportComplete,
  onClose
}: NFeXMLImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedSupplier, setParsedSupplier] = useState<any>(null);
  const [invoiceInfo, setInvoiceInfo] = useState<{ number: string; series: string; date: string } | null>(null);
  const [items, setItems] = useState<NFeItemParsed[]>([]);
  const [duplicates, setDuplicates] = useState<NFeDuplicateParsed[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xml")) {
      toast.error("Por favor, selecione um arquivo XML de NF-e válido.");
      return;
    }

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const xmlText = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");

        const parseError = xmlDoc.querySelector("parsererror");
        if (parseError) {
          throw new Error("Erro ao ler arquivo XML: formato inválido.");
        }

        // Supplier Info
        const emitNode = xmlDoc.querySelector("emit");
        let supplierData: any = null;
        if (emitNode) {
          const cnpj = emitNode.querySelector("CNPJ")?.textContent || emitNode.querySelector("CPF")?.textContent || "";
          const name = emitNode.querySelector("xNome")?.textContent || "";
          const tradeName = emitNode.querySelector("xFant")?.textContent || "";
          const phone = emitNode.querySelector("fone")?.textContent || "";
          const state = emitNode.querySelector("UF")?.textContent || "";
          const city = emitNode.querySelector("xMun")?.textContent || "";

          // Try to match existing supplier by CNPJ or name
          const matchedSupplier = suppliers.find(s => 
            (cnpj && s.cnpj?.replace(/\D/g, "") === cnpj.replace(/\D/g, "")) ||
            (name && s.name?.toLowerCase() === name.toLowerCase())
          );

          if (matchedSupplier) {
            supplierData = matchedSupplier;
          } else {
            supplierData = {
              name: tradeName || name,
              cnpj,
              phone,
              address_state: state,
              address_city: city,
              isNew: true
            };
          }
        }

        // Invoice Info
        const ideNode = xmlDoc.querySelector("ide");
        const invNum = ideNode?.querySelector("nNF")?.textContent || "";
        const invSeries = ideNode?.querySelector("serie")?.textContent || "1";
        const invDate = ideNode?.querySelector("dhEmi")?.textContent || new Date().toISOString();
        setInvoiceInfo({ number: invNum, series: invSeries, date: invDate });

        // Duplicates / Cobrança (<cobr><dup>)
        const dupNodes = xmlDoc.querySelectorAll("cobr dup");
        const parsedDups: NFeDuplicateParsed[] = [];
        dupNodes.forEach((dup, idx) => {
          const nDup = dup.querySelector("nDup")?.textContent || `${idx + 1}`;
          const dVenc = dup.querySelector("dVenc")?.textContent || "";
          const vDup = parseFloat(dup.querySelector("vDup")?.textContent || "0");
          if (!isNaN(vDup) && vDup > 0) {
            parsedDups.push({
              number: nDup,
              dueDate: dVenc,
              amount: vDup
            });
          }
        });
        setDuplicates(parsedDups);

        // Items
        const detNodes = xmlDoc.querySelectorAll("det");
        const parsedList: NFeItemParsed[] = [];

        detNodes.forEach((det) => {
          const prod = det.querySelector("prod");
          if (!prod) return;

          const cProd = prod.querySelector("cProd")?.textContent || "";
          const cEAN = prod.querySelector("cEAN")?.textContent || "";
          const xProd = prod.querySelector("xProd")?.textContent || "";
          const ncm = prod.querySelector("NCM")?.textContent || "";
          const cfop = prod.querySelector("CFOP")?.textContent || "";
          const uCom = prod.querySelector("uCom")?.textContent || "UN";
          const qCom = parseFloat(prod.querySelector("qCom")?.textContent || "1");
          const vUnCom = parseFloat(prod.querySelector("vUnCom")?.textContent || "0");
          const vProd = parseFloat(prod.querySelector("vProd")?.textContent || "0");

          // Auto-match product by barcode or name
          const cleanEan = cEAN && cEAN !== "SEM GTIN" ? cEAN.trim() : "";
          const matchedProd = products.find(p => 
            (cleanEan && p.barcode === cleanEan) ||
            (p.name?.toLowerCase().trim() === xProd.toLowerCase().trim())
          );

          const matchedLoc = matchedProd ? (
            matchedProd.storage_location || 
            matchedProd.storage_code || 
            [matchedProd.storage_room, matchedProd.storage_rack, matchedProd.storage_shelf].filter(Boolean).join("-") || 
            ""
          ) : "";

          parsedList.push({
            code: cProd,
            ean: cleanEan,
            name: xProd,
            ncm,
            cfop,
            unit: uCom,
            quantity: isNaN(qCom) || qCom <= 0 ? 1 : qCom,
            unitCost: isNaN(vUnCom) ? 0 : vUnCom,
            totalCost: isNaN(vProd) ? 0 : vProd,
            linkedProductId: matchedProd?.id,
            linkedProductName: matchedProd?.name,
            storageLocation: matchedLoc
          });
        });

        setParsedSupplier(supplierData);
        setItems(parsedList);
        toast.success(`XML importado: ${parsedList.length} itens extraídos${parsedDups.length > 0 ? ` e ${parsedDups.length} duplicatas` : ""}.`);
      } catch (err: any) {
        console.error("Erro ao analisar XML:", err);
        toast.error(err.message || "Erro ao processar o XML da NF-e.");
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleLinkProduct = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    const loc = prod ? (
      prod.storage_location || 
      prod.storage_code || 
      [prod.storage_room, prod.storage_rack, prod.storage_shelf].filter(Boolean).join("-") || 
      ""
    ) : "";

    setItems(prev => prev.map((item, i) => i === index ? {
      ...item,
      linkedProductId: prod?.id,
      linkedProductName: prod?.name,
      storageLocation: loc,
      isNewProduct: false
    } : item));
  };

  const handleMarkAsNew = (index: number) => {
    setItems(prev => prev.map((item, i) => i === index ? {
      ...item,
      linkedProductId: undefined,
      linkedProductName: undefined,
      isNewProduct: true
    } : item));
  };

  const handleUpdateItemLocation = (index: number, location: string) => {
    setItems(prev => prev.map((item, i) => i === index ? {
      ...item,
      storageLocation: location
    } : item));
  };

  const handleConfirmImport = async () => {
    try {
      let finalSupplier = parsedSupplier;

      // If supplier is new, auto-create it
      if (parsedSupplier?.isNew) {
        const newSuppRef = await api.post("suppliers", {
          name: parsedSupplier.name,
          cnpj: parsedSupplier.cnpj,
          phone: parsedSupplier.phone,
          address_state: parsedSupplier.address_state,
          address_city: parsedSupplier.address_city,
          company_id: currentCompanyId,
          active: true,
          created_at: new Date().toISOString()
        }) as any;
        finalSupplier = { ...parsedSupplier, id: newSuppRef.id, isNew: false };
      }

      // Convert items to cart format
      const finalItems = [];

      for (const item of items) {
        let prodId = item.linkedProductId;
        let prodName = item.linkedProductName || item.name;

        // If marked as new product or not linked, create product with initial storage location
        if (item.isNewProduct || !prodId) {
          const created = await api.post("products", {
            name: item.name,
            barcode: item.ean || "",
            ncm: item.ncm || "",
            cost_price: item.unitCost,
            cost: item.unitCost,
            price: Number((item.unitCost * 1.4).toFixed(2)), // Default 40% margin
            stock_quantity: 0,
            unit: item.unit,
            storage_location: item.storageLocation || "",
            company_id: currentCompanyId,
            created_at: new Date().toISOString()
          }) as any;
          prodId = created.id;
          prodName = item.name;
        }

        finalItems.push({
          id: prodId,
          name: prodName,
          quantity: item.quantity,
          cost: item.unitCost,
          price: item.unitCost * 1.4,
          ncm: item.ncm,
          storage_location: item.storageLocation || "",
          type: "product"
        });
      }

      // Auto-generate Accounts Payable records for extracted XML duplicates if present
      if (duplicates.length > 0) {
        try {
          for (const dup of duplicates) {
            await api.post("accountsPayable", {
              company_id: currentCompanyId,
              description: `NF-e ${invoiceInfo?.number || ''} Parc. ${dup.number} - ${finalSupplier?.name || 'Fornecedor'}`,
              supplier: finalSupplier?.name || "Fornecedor",
              amount: dup.amount,
              due_date: dup.dueDate || new Date().toISOString().split("T")[0],
              status: "Pendente",
              category_name: "Fornecedores / Mercadorias",
              invoice_number: invoiceInfo?.number || "",
              installment_number: dup.number,
              observation: `Duplicata nº ${dup.number} importada automaticamente do XML da NF-e nº ${invoiceInfo?.number || ''}`,
              created_at: new Date().toISOString()
            });
          }
          toast.success(`${duplicates.length} duplicatas geradas automaticamente no Contas a Pagar!`);
        } catch (err: any) {
          console.error("Erro ao gerar contas a pagar das duplicatas:", err);
          toast.error("Aviso: Houve um problema ao criar as duplicatas no Contas a Pagar.");
        }
      }

      onImportComplete({
        supplier: finalSupplier,
        items: finalItems,
        invoiceNumber: invoiceInfo?.number || "",
        series: invoiceInfo?.series || "1",
        duplicates
      });

      toast.success("Importação concluída! Os itens e fornecedor foram carregados na compra.");
      onClose();
    } catch (err: any) {
      toast.error(`Falha ao concluir importação: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-6 shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 text-orange-600 rounded-2xl">
              <FileCode size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Importação de NF-e via XML</h2>
              <p className="text-xs text-gray-500">Faça o upload do XML para vincular fornecedor, itens, endereçamento e duplicatas financeiras.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Upload Zone */}
        {items.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-orange-300 bg-orange-50/50 hover:bg-orange-50 rounded-2xl p-12 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload size={48} className="mx-auto text-orange-500 mb-4" />
            <h3 className="text-base font-bold text-gray-800 mb-1">
              {isParsing ? "Lendo XML da NF-e..." : "Clique ou arraste o arquivo XML da NF-e"}
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              O sistema extrairá o fornecedor (CNPJ/Razão Social), os produtos com NCM, código EAN, quantidades, custos e parcelas de cobrança.
            </p>
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            {/* Supplier & Invoice summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-orange-50/60 border border-orange-200/60 rounded-2xl text-xs">
              <div>
                <span className="font-bold text-orange-950 block uppercase tracking-wider text-[10px] mb-1">Fornecedor Identificado</span>
                <p className="font-bold text-sm text-gray-900">{parsedSupplier?.name || "Desconhecido"}</p>
                <p className="text-gray-600">CNPJ: {parsedSupplier?.cnpj || "Não informado"}</p>
                {parsedSupplier?.isNew ? (
                  <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    Novo fornecedor (será cadastrado)
                  </span>
                ) : (
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    ✓ Fornecedor já cadastrado
                  </span>
                )}
              </div>

              <div>
                <span className="font-bold text-orange-950 block uppercase tracking-wider text-[10px] mb-1">Dados da Nota Fiscal</span>
                <p className="font-bold text-gray-900">Número: {invoiceInfo?.number} (Série {invoiceInfo?.series})</p>
                <p className="text-gray-600">Emissão: {new Date(invoiceInfo?.date || "").toLocaleDateString("pt-BR")}</p>
                <p className="text-gray-600 font-bold mt-1">Total de Itens: {items.length}</p>
              </div>

              <div>
                <span className="font-bold text-orange-950 block uppercase tracking-wider text-[10px] mb-1">Cobrança / Duplicatas</span>
                {duplicates.length > 0 ? (
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 font-bold text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                      <Receipt size={12} /> {duplicates.length} parcela(s) no Contas a Pagar
                    </span>
                    <p className="text-[11px] text-gray-600 mt-1">
                      Total: {formatCurrency(duplicates.reduce((acc, d) => acc + d.amount, 0))}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Nenhuma duplicata no XML (Pagamento à vista / sem cobrança)</p>
                )}
              </div>
            </div>

            {/* Items Table with Linking Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-800">Vincular Itens da NF-e e Definir Endereçamento</h3>
                <div className="relative w-64">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filtrar itens..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 max-h-[340px] overflow-y-auto">
                {items
                  .filter(it => it.name.toLowerCase().includes(searchFilter.toLowerCase()) || it.code.includes(searchFilter))
                  .map((item, idx) => {
                    const isLinked = !!item.linkedProductId;
                    const isNew = !!item.isNewProduct;

                    return (
                      <div key={idx} className="p-3.5 bg-white hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                              Cód: {item.code}
                            </span>
                            {item.ean && (
                              <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                EAN: {item.ean}
                              </span>
                            )}
                            <span className="font-bold text-gray-900 truncate">{item.name}</span>
                          </div>
                          <div className="text-gray-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span>Qtd: <strong>{item.quantity} {item.unit}</strong></span>
                            <span>Custo Un: <strong>{formatCurrency(item.unitCost)}</strong></span>
                            <span>Total: <strong>{formatCurrency(item.totalCost)}</strong></span>
                            {item.ncm && <span>NCM: {item.ncm}</span>}
                            {item.storageLocation && (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                <Warehouse size={10} className="text-emerald-600" />
                                {item.storageLocation}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Link / Create Selection & Location input */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 min-w-[320px]">
                          {isLinked ? (
                            <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl w-full">
                              <span className="font-bold text-emerald-700 truncate flex items-center gap-1.5">
                                <CheckCircle size={14} /> {item.linkedProductName}
                              </span>
                              <button
                                onClick={() => handleLinkProduct(idx, "")}
                                className="text-gray-400 hover:text-red-500 text-xs p-1 cursor-pointer"
                                title="Desvincular"
                              >
                                ✕
                              </button>
                            </div>
                          ) : isNew ? (
                            <div className="flex items-center gap-2 w-full">
                              <div className="flex items-center justify-between gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl flex-1">
                                <span className="font-bold text-blue-700">
                                  + Novo Produto
                                </span>
                                <button
                                  onClick={() => handleLinkProduct(idx, "")}
                                  className="text-gray-400 hover:text-red-500 text-xs p-1 cursor-pointer"
                                  title="Alterar"
                                >
                                  ✕
                                </button>
                              </div>
                              <input 
                                type="text"
                                placeholder="Endereço (ex: A1-E02)"
                                value={item.storageLocation || ""}
                                onChange={(e) => handleUpdateItemLocation(idx, e.target.value)}
                                className="w-28 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-orange-500"
                                title="Definir endereço físico de armazenagem"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 w-full">
                              <select
                                onChange={(e) => {
                                  if (e.target.value === "__NEW__") {
                                    handleMarkAsNew(idx);
                                  } else if (e.target.value) {
                                    handleLinkProduct(idx, e.target.value);
                                  }
                                }}
                                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-orange-500"
                                defaultValue=""
                              >
                                <option value="">Vincular ao produto...</option>
                                <option value="__NEW__">+ Cadastrar como Novo</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {items.length > 0 ? (
            <button
              onClick={() => {
                setItems([]);
                setDuplicates([]);
                setParsedSupplier(null);
                setInvoiceInfo(null);
              }}
              className="text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              ← Escolher outro arquivo XML
            </button>
          ) : <div />}

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer"
            >
              Cancelar
            </button>
            {items.length > 0 && (
              <button
                onClick={handleConfirmImport}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-100 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle size={16} /> Carregar Itens na Compra
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
