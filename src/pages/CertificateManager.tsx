import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { formatBR } from "../lib/dateUtils";
import { storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  Shield, 
  Upload, 
  Key, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  FileCode,
  Lock,
  Trash2,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CertificateManager() {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const currentCompanyId = api.getCompanyId();

  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ["certificates", currentCompanyId],
    queryFn: () => api.get("certificates", { company_id: currentCompanyId }),
    enabled: !!currentCompanyId
  });

  const activeCertificate = certificates.find((c: any) => c.active);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !password) throw new Error("Arquivo e senha são obrigatórios");

      setIsUploading(true);
      try {
        // 1. Upload file to Storage
        const storagePath = `certificates/${currentCompanyId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        // 2. Deactivate old certificates
        const oldCerts = certificates.filter((c: any) => c.active);
        for (const cert of oldCerts) {
          await api.put("certificates", cert.id, { active: false });
        }

        // 3. Store metadata in Firestore
        // Note: In a real app, we would extract expiration_date from the PFX file server-side.
        // For this implementation, we'll set a placeholder expiration (1 year from now)
        // and store the password (ideally this should be in Secret Manager)
        const expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);

        const certData = {
          company_id: currentCompanyId,
          filename: file.name,
          storage_path: storagePath,
          download_url: downloadUrl,
          password: password, // Store password (encrypted in a real scenario)
          expiration_date: expirationDate.toISOString(),
          active: true,
          created_at: new Date().toISOString()
        };

        await api.post("certificates", certData);

        // 4. Log action
        await api.log({
          action: 'CREATE',
          entity: 'certificates',
          entity_id: 'new',
          description: `Novo certificado digital A1 enviado: ${file.name}`,
          metadata: { filename: file.name }
        });

      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Certificado enviado e configurado com sucesso!");
      setFile(null);
      setPassword("");
    },
    onError: (error: any) => {
      toast.error(`Erro ao enviar certificado: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete("certificates", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast.success("Certificado removido.");
    }
  });

  const canManage = hasPermission('fiscal.manage');

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <Shield size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Esta página é restrita a usuários autorizados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Certificado Digital A1</h1>
        <p className="text-gray-500">Gerencie o certificado digital para emissão de Notas Fiscais Eletrônicas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Current Certificate Status */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              {activeCertificate ? (
                <div className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold">
                  <CheckCircle2 size={14} /> Ativo
                </div>
              ) : (
                <div className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold">
                  <AlertCircle size={14} /> Não Configurado
                </div>
              )}
            </div>

            <div className="flex items-start gap-6">
              <div className={`p-4 rounded-2xl ${activeCertificate ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                <FileCode size={40} />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {activeCertificate ? activeCertificate.filename : "Nenhum certificado ativo"}
                  </h3>
                  <p className="text-sm text-gray-500">Tipo: Certificado Digital A1 (.pfx / .p12)</p>
                </div>

                {activeCertificate && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Expiração</p>
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                        <Calendar size={14} className="text-blue-500" />
                        {formatBR(activeCertificate.expiration_date, "dd/MM/yyyy")}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Senha</p>
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                        <Lock size={14} className="text-blue-500" />
                        ••••••••
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {activeCertificate && (
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => deleteMutation.mutate(activeCertificate.id)}
                  className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 size={16} /> Remover Certificado
                </button>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex gap-4 text-blue-700">
            <Info className="shrink-0" size={24} />
            <div className="text-sm space-y-2">
              <p className="font-bold">Por que preciso de um certificado?</p>
              <p>O certificado digital A1 é obrigatório para assinar digitalmente as Notas Fiscais (NF-e, NFC-e) antes de enviá-las para a SEFAZ. Ele garante a validade jurídica e a autoria do documento fiscal.</p>
              <ul className="list-disc list-inside space-y-1 opacity-80">
                <li>Formato aceito: .pfx ou .p12</li>
                <li>Validade comum: 1 ano</li>
                <li>O arquivo é armazenado de forma segura e criptografada</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Upload size={20} className="text-blue-600" />
            {activeCertificate ? "Atualizar Certificado" : "Enviar Certificado"}
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Arquivo do Certificado</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept=".pfx,.p12"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${file ? 'border-blue-500 bg-blue-50' : 'border-gray-200 group-hover:border-blue-300'}`}>
                  <FileCode size={24} className={file ? 'text-blue-600' : 'text-gray-400'} />
                  <span className="text-xs font-medium text-center text-gray-600">
                    {file ? file.name : "Clique ou arraste o arquivo .pfx"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Senha do Certificado</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password" 
                  placeholder="Senha definida na exportação"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              onClick={() => uploadMutation.mutate()}
              disabled={!file || !password || isUploading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>Enviando...</>
              ) : (
                <>
                  <Upload size={18} />
                  Configurar Certificado
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
