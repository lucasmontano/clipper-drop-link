import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Session, User } from '@supabase/supabase-js';

interface UploadConfig {
  max_file_size_mb: number;
  allowed_formats: string[];
}

const VideoUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadConfig, setUploadConfig] = useState<UploadConfig | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadUploadConfig();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate('/auth');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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

  const validateFile = (file: File): { isValid: boolean; message: string } => {
    console.log('=== FILE VALIDATION DEBUG ===');
    console.log('Upload config:', uploadConfig);
    console.log('File name:', file.name);
    console.log('File size (bytes):', file.size);
    console.log('File size (MB):', file.size / (1024 * 1024));
    
    if (!uploadConfig) {
      console.log('Upload config not loaded');
      return { isValid: false, message: "Configurações não carregadas" };
    }

    const fileSizeMB = file.size / (1024 * 1024);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    console.log('Calculated file size MB:', fileSizeMB);
    console.log('Max allowed MB:', uploadConfig.max_file_size_mb);
    console.log('File extension:', fileExtension);
    console.log('Allowed formats:', uploadConfig.allowed_formats);

    if (fileSizeMB > uploadConfig.max_file_size_mb) {
      console.log('File too large!');
      return { 
        isValid: false, 
        message: `Arquivo muito grande. Tamanho: ${fileSizeMB.toFixed(2)}MB, Máximo permitido: ${uploadConfig.max_file_size_mb}MB` 
      };
    }

    if (!fileExtension || !uploadConfig.allowed_formats.includes(fileExtension)) {
      console.log('Invalid format!');
      return { 
        isValid: false, 
        message: `Formato não permitido. Formatos aceitos: ${uploadConfig.allowed_formats.join(', ')}` 
      };
    }

    console.log('File validation passed!');
    return { isValid: true, message: "" };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.isValid) {
      toast({
        title: "Arquivo inválido",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const uploadVideo = async () => {
    if (!selectedFile || !user) {
      toast({
        title: "Erro",
        description: "Arquivo ou usuário não encontrado.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${Date.now()}-${selectedFile.name}`;
      const filePath = `${user.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('video-uploads')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      toast({
        title: "Upload concluído!",
        description: "Seu vídeo foi enviado com sucesso.",
      });

      // Reset form
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Erro ao fazer upload do vídeo.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
      // Clear any remaining storage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      navigate('/auth');
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro no logout:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer logout.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p>Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">
                Upload de Vídeo para Clippers
              </CardTitle>
              <CardDescription>
                Bem-vindo, {user.email}! Envie seus vídeos com segurança.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Requirements */}
          {uploadConfig && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Requisitos de Upload:</h3>
              <ul className="text-sm space-y-1">
                <li>• Tamanho máximo: {uploadConfig.max_file_size_mb}MB</li>
                <li>• Formatos aceitos: {uploadConfig.allowed_formats.join(', ')}</li>
              </ul>
            </div>
          )}

          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="video">Selecionar vídeo</Label>
            <Input
              id="video"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              ref={fileInputRef}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Upload Button */}
          <Button
            onClick={uploadVideo}
            disabled={isUploading || !selectedFile}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando vídeo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Fazer Upload
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoUpload;