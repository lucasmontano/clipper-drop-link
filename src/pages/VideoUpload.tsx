import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, LogOut, Link } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Session, User } from '@supabase/supabase-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UploadConfig {
  max_file_size_mb: number;
  allowed_formats: string[];
}

interface RateLimitResult {
  allowed: boolean;
  current_attempts: number;
  max_attempts: number;
  remaining_attempts?: number;
  message?: string;
}

const VideoUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
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
    console.log('=== LOADING UPLOAD CONFIG ===');
    try {
      const { data, error } = await supabase
        .from('upload_configs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      console.log('Upload config query result:', { data, error });

      if (error) throw error;
      
      console.log('Setting upload config:', data);
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
    console.log('=== FILE SELECT TRIGGERED ===');
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, 'Upload config state:', uploadConfig);

    const validation = validateFile(file);
    console.log('Validation result:', validation);
    
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

  const sendThankYouEmail = async (submissionType: 'file_upload' | 'url_link', fileName?: string, videoUrl?: string) => {
    try {
      console.log('=== SENDING THANK YOU EMAIL ===');
      const { data, error } = await supabase.functions.invoke('send-thank-you-email', {
        body: {
          userEmail: user?.email,
          submissionType,
          fileName,
          videoUrl
        }
      });

      if (error) {
        console.error('Email sending error:', error);
      } else {
        console.log('Thank you email sent successfully:', data);
      }
    } catch (error) {
      console.error('Error sending thank you email:', error);
    }
  };

  const validateUrl = (url: string): { isValid: boolean; message: string } => {
    if (!url) {
      return { isValid: false, message: "URL é obrigatória" };
    }

    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { isValid: false, message: "URL deve usar protocolo HTTP ou HTTPS" };
      }

      return { isValid: true, message: "" };
    } catch {
      return { isValid: false, message: "URL inválida" };
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoUrl(e.target.value);
  };

  const uploadFromUrl = async () => {
    if (!videoUrl || !user) {
      toast({
        title: "Erro",
        description: "URL ou usuário não encontrado.",
        variant: "destructive",
      });
      return;
    }

    // Validate URL
    const validation = validateUrl(videoUrl);
    if (!validation.isValid) {
      toast({
        title: "URL inválida",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      console.log('=== STARTING URL SUBMISSION PROCESS ===');
      console.log('Video URL:', videoUrl);
      console.log('User ID:', user.id);

      // Check rate limit before submission
      console.log('=== CHECKING RATE LIMIT ===');
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .rpc('check_and_increment_upload_attempts', { user_uuid: user.id });

      console.log('Rate limit response:', { rateLimitData, rateLimitError });

      if (rateLimitError) {
        console.error('Rate limit error:', rateLimitError);
        throw new Error('Erro ao verificar limite de uploads');
      }

      const rateLimitResult = rateLimitData as unknown as RateLimitResult;
      console.log('Rate limit result:', rateLimitResult);

      if (!rateLimitResult.allowed) {
        console.log('Rate limit exceeded');
        toast({
          title: "Limite excedido",
          description: rateLimitResult.message || "Limite diário de uploads excedido",
          variant: "destructive",
        });
        return;
      }

      console.log('=== SAVING URL TO DATABASE ===');
      // Save URL submission to database
      const { data: submissionData, error: submissionError } = await supabase
        .from('video_submissions')
        .insert({
          user_id: user.id,
          user_email: user.email,
          submission_type: 'url_link',
          video_url: videoUrl,
          original_filename: videoUrl.split('/').pop() || 'video-link'
        })
        .select()
        .single();

      if (submissionError) {
        console.error('Database insert error:', submissionError);
        throw submissionError;
      }

      console.log('=== URL SUBMISSION SUCCESSFUL ===');
      console.log('Submission data:', submissionData);

      // Send thank you email
      await sendThankYouEmail('url_link', undefined, videoUrl);

      toast({
        title: "Submissão concluída!",
        description: `Seu link de vídeo foi salvo com sucesso. Você tem ${rateLimitResult.remaining_attempts} submissões restantes hoje.`,
      });

      // Reset form
      setVideoUrl('');
    } catch (error: any) {
      console.error('=== URL SUBMISSION ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      toast({
        title: "Erro na submissão",
        description: error.message || "Erro ao salvar o link do vídeo.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
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
      console.log('=== STARTING UPLOAD PROCESS ===');
      console.log('File size (bytes):', selectedFile.size);
      console.log('File size (MB):', selectedFile.size / (1024 * 1024));
      console.log('User ID:', user.id);

      // Check rate limit before upload
      console.log('=== CHECKING RATE LIMIT ===');
      const { data: rateLimitData, error: rateLimitError } = await supabase
        .rpc('check_and_increment_upload_attempts', { user_uuid: user.id });

      console.log('Rate limit response:', { rateLimitData, rateLimitError });

      if (rateLimitError) {
        console.error('Rate limit error:', rateLimitError);
        throw new Error('Erro ao verificar limite de uploads');
      }

      const rateLimitResult = rateLimitData as unknown as RateLimitResult;
      console.log('Rate limit result:', rateLimitResult);

      if (!rateLimitResult.allowed) {
        console.log('Rate limit exceeded');
        toast({
          title: "Limite excedido",
          description: rateLimitResult.message || "Limite diário de uploads excedido",
          variant: "destructive",
        });
        return;
      }

      console.log('=== STARTING STORAGE UPLOAD ===');
      const fileName = `${Date.now()}-${selectedFile.name}`;
      const filePath = `${user.id}/${fileName}`;
      console.log('Upload path:', filePath);

      const { data, error } = await supabase.storage
        .from('video-uploads')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      console.log('Storage upload response:', { data, error });

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }

      console.log('=== UPLOAD SUCCESSFUL ===');

      // Save file submission to database
      const { data: submissionData, error: submissionError } = await supabase
        .from('video_submissions')
        .insert({
          user_id: user.id,
          user_email: user.email,
          submission_type: 'file_upload',
          file_path: data.path,
          original_filename: selectedFile.name,
          file_size_bytes: selectedFile.size
        })
        .select()
        .single();

      if (submissionError) {
        console.error('Database insert error:', submissionError);
        console.warn('File uploaded but not recorded in submissions table');
      } else {
        console.log('Submission recorded:', submissionData);
      }

      // Send thank you email
      await sendThankYouEmail('file_upload', selectedFile.name);

      toast({
        title: "Upload concluído!",
        description: `Seu vídeo foi enviado com sucesso. Você tem ${rateLimitResult.remaining_attempts} uploads restantes hoje.`,
      });

      // Reset form
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error('=== UPLOAD ERROR ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
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

          {/* Upload Options Tabs */}
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload de Arquivo
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-2">
                <Link className="w-4 h-4" />
                Link do Vídeo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="videoUrl">URL do vídeo</Label>
                <Input
                  id="videoUrl"
                  type="url"
                  value={videoUrl}
                  onChange={handleUrlChange}
                  placeholder="https://exemplo.com/video.mp4"
                />
                {videoUrl && (
                  <p className="text-sm text-muted-foreground">
                    URL: {videoUrl}
                  </p>
                )}
              </div>

              <Button
                onClick={uploadFromUrl}
                disabled={isUploading || !videoUrl}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando link...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-4 w-4" />
                    Salvar Link
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoUpload;