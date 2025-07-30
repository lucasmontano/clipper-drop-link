import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UploadConfig {
  max_file_size_mb: number;
  allowed_formats: string[];
}

export default function VideoUpload() {
  const [email, setEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadConfig, setUploadConfig] = useState<UploadConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [uploadToken, setUploadToken] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUploadConfig();
    
    // Check for verification token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      verifyUploadToken(token);
    }
  }, []);

  const loadUploadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('upload_configs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setUploadConfig(data);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações de upload",
        variant: "destructive",
      });
    }
  };

  const verifyUploadToken = async (token: string) => {
    try {
      const response = await supabase.functions.invoke('verify-upload', {
        body: { token }
      });
      
      if (response.data?.success) {
        setUploadToken(token);
        toast({
          title: "Upload autorizado!",
          description: "Você pode agora fazer upload do seu vídeo.",
        });
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
    }
  };

  const validateFile = (file: File): string | null => {
    if (!uploadConfig) return "Configurações não carregadas";

    const fileSizeMB = file.size / (1024 * 1024);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileSizeMB > uploadConfig.max_file_size_mb) {
      return `Arquivo muito grande. Máximo permitido: ${uploadConfig.max_file_size_mb}MB`;
    }

    if (!fileExtension || !uploadConfig.allowed_formats.includes(fileExtension)) {
      return `Formato não permitido. Formatos aceitos: ${uploadConfig.allowed_formats.join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast({
        title: "Arquivo inválido",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const sendMagicLink = async () => {
    if (!selectedFile || !email) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-magic-link', {
        body: {
          email,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type
        }
      });

      if (error) throw error;

      setMagicLinkSent(true);
      toast({
        title: "Magic link enviado!",
        description: "Verifique seu email para autorizar o upload.",
      });
    } catch (error) {
      console.error('Erro ao enviar magic link:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o magic link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadVideo = async () => {
    if (!selectedFile || !uploadToken) return;

    setIsUploading(true);
    try {
      const filePath = `${uploadToken}/${selectedFile.name}`;
      
      const { error } = await supabase.storage
        .from('video-uploads')
        .upload(filePath, selectedFile);

      if (error) throw error;

      toast({
        title: "Upload realizado com sucesso!",
        description: "Seu vídeo foi enviado.",
      });
      
      // Reset form
      setSelectedFile(null);
      setEmail("");
      setMagicLinkSent(false);
      setUploadToken(null);
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload do vídeo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-6 h-6" />
              Upload de Vídeo - Clippers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {uploadConfig && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Requisitos: Máximo {uploadConfig.max_file_size_mb}MB, 
                  formatos aceitos: {uploadConfig.allowed_formats.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email do Clipper</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  disabled={magicLinkSent}
                />
              </div>

              <div>
                <Label htmlFor="video">Arquivo de Vídeo</Label>
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  disabled={magicLinkSent}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Arquivo selecionado: {selectedFile.name} 
                    ({(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)
                  </p>
                )}
              </div>

              {!magicLinkSent && !uploadToken && (
                <Button
                  onClick={sendMagicLink}
                  disabled={!selectedFile || !email || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando magic link...
                    </>
                  ) : (
                    "Enviar Magic Link"
                  )}
                </Button>
              )}

              {magicLinkSent && !uploadToken && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Magic link enviado para {email}. Verifique seu email e clique no link para autorizar o upload.
                  </AlertDescription>
                </Alert>
              )}

              {uploadToken && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Upload autorizado! Agora você pode enviar seu vídeo.
                    </AlertDescription>
                  </Alert>
                  
                  <Button
                    onClick={uploadVideo}
                    disabled={!selectedFile || isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Fazendo upload...
                      </>
                    ) : (
                      "Fazer Upload do Vídeo"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}