import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogOut, Link, Trash2, Download, ExternalLink, Youtube, Instagram, Twitter, Facebook, Linkedin, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Session, User } from '@supabase/supabase-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface VideoSubmission {
  id: string;
  user_id: string;
  user_email: string | null;
  submission_type: string;
  file_path: string | null;
  video_url: string | null;
  original_filename: string | null;
  file_size_bytes: number | null;
  created_at: string;
}

const VideoUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [uploadConfig, setUploadConfig] = useState<UploadConfig | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<VideoSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadUserSubmissions = async () => {
    if (!user) return;
    
    try {
      setLoadingSubmissions(true);
      const { data, error } = await supabase
        .from('video_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setUserSubmissions(data || []);
    } catch (error: any) {
      console.error('Error loading user submissions:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas submissões.",
        variant: "destructive",
      });
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    loadUploadConfig();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate('/auth');
        } else {
          // Load user submissions when user is authenticated
          setTimeout(() => {
            loadUserSubmissions();
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate('/auth');
      } else {
        loadUserSubmissions();
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

  const getSocialMediaIcon = (url: string) => {
    if (!url) return Globe;
    
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      return Youtube;
    } else if (urlLower.includes('instagram.com')) {
      return Instagram;
    } else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
      return Twitter;
    } else if (urlLower.includes('facebook.com')) {
      return Facebook;
    } else if (urlLower.includes('linkedin.com')) {
      return Linkedin;
    }
    
    return Globe;
  };

  const getSocialMediaName = (url: string) => {
    if (!url) return 'Website';
    
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      return 'YouTube';
    } else if (urlLower.includes('instagram.com')) {
      return 'Instagram';
    } else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
      return 'Twitter/X';
    } else if (urlLower.includes('facebook.com')) {
      return 'Facebook';
    } else if (urlLower.includes('linkedin.com')) {
      return 'LinkedIn';
    }
    
    return 'Website';
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
      console.log('Full user object:', JSON.stringify(user, null, 2)); // Debug full user object
      console.log('User email:', user.email); // Debug user email
      console.log('User metadata:', user.user_metadata); // Debug user metadata
      console.log('User app metadata:', user.app_metadata); // Debug app metadata
      
      // Get user email - try multiple sources
      const userEmail = user.email || 
                       user.user_metadata?.email || 
                       user.app_metadata?.email ||
                       user.identities?.[0]?.identity_data?.email ||
                       null;
      console.log('Final user email used:', userEmail);
      
      // Save URL submission to database
      const { data: submissionData, error: submissionError } = await supabase
        .from('video_submissions')
        .insert({
          user_id: user.id,
          user_email: userEmail,
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
      
      // Reload user submissions
      await loadUserSubmissions();
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

  const deleteSubmission = async (submissionId: string, filePath?: string) => {
    try {
      // Delete from storage if it's a file upload
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('video-uploads')
          .remove([filePath]);
        
        if (storageError) {
          console.error('Storage deletion error:', storageError);
          // Continue with database deletion even if storage fails
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('video_submissions')
        .delete()
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: "Submissão excluída",
        description: "Sua submissão foi excluída com sucesso.",
      });

      // Reload submissions
      await loadUserSubmissions();
    } catch (error: any) {
      console.error('Error deleting submission:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a submissão.",
        variant: "destructive",
      });
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('video-uploads')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: `Baixando ${fileName}...`,
      });
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
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

      console.log('=== SAVING FILE TO DATABASE ===');
      console.log('Full user object:', JSON.stringify(user, null, 2)); // Debug full user object
      console.log('User email:', user.email); // Debug user email
      console.log('User metadata:', user.user_metadata); // Debug user metadata
      console.log('User app metadata:', user.app_metadata); // Debug app metadata
      
      // Get user email - try multiple sources
      const userEmail = user.email || 
                       user.user_metadata?.email || 
                       user.app_metadata?.email ||
                       user.identities?.[0]?.identity_data?.email ||
                       null;
      console.log('Final user email used:', userEmail);
      
      // Save file submission to database
      const { data: submissionData, error: submissionError } = await supabase
        .from('video_submissions')
        .insert({
          user_id: user.id,
          user_email: userEmail,
          submission_type: 'file_upload',
          file_path: data.path,
          original_filename: selectedFile.name,
          file_size_bytes: selectedFile.size
        })
        .select()
        .single();

      if (submissionError) {
        console.error('Database insert error:', submissionError);
        throw new Error('Arquivo enviado, mas falha ao registrar na base de dados. Tente novamente.');
      }
      
      console.log('Submission recorded:', submissionData);

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
      
      // Reload user submissions
      await loadUserSubmissions();
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
    <div className="min-h-screen bg-background p-6 space-y-6">
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

          {/* Social Media URL Input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="videoUrl">URL da mídia social</Label>
              <div className="relative">
                <Input
                  id="videoUrl"
                  type="url"
                  value={videoUrl}
                  onChange={handleUrlChange}
                  placeholder="https://youtube.com/watch?v=... ou outro link de mídia social"
                  className="pl-10"
                />
                {videoUrl && (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    {(() => {
                      const IconComponent = getSocialMediaIcon(videoUrl);
                      return <IconComponent className="w-4 h-4 text-muted-foreground" />;
                    })()}
                  </div>
                )}
              </div>
              {videoUrl && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {(() => {
                    const IconComponent = getSocialMediaIcon(videoUrl);
                    return <IconComponent className="w-4 h-4" />;
                  })()}
                  <span>Detectado: {getSocialMediaName(videoUrl)}</span>
                </div>
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
          </div>
        </CardContent>
      </Card>

      {/* User Submissions */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl">Suas Submissões</CardTitle>
          <CardDescription>
            Gerencie seus vídeos enviados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSubmissions ? (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Carregando submissões...</p>
            </div>
          ) : userSubmissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Você ainda não fez nenhuma submissão.</p>
              <p className="text-sm">Use o formulário acima para adicionar seus links de mídia social.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Arquivo/URL</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        {formatDate(submission.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={submission.submission_type === 'file_upload' ? 'default' : 'secondary'}>
                          {submission.submission_type === 'file_upload' ? 'Arquivo' : 'Link'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {submission.submission_type === 'file_upload' ? (
                          <span className="text-sm">
                            {submission.original_filename || 'Arquivo sem nome'}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {(() => {
                              const IconComponent = getSocialMediaIcon(submission.video_url || '');
                              return <IconComponent className="w-4 h-4 text-muted-foreground" />;
                            })()}
                            <a
                              href={submission.video_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              <span>{getSocialMediaName(submission.video_url || '')}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatFileSize(submission.file_size_bytes)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {submission.submission_type === 'file_upload' && submission.file_path && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadFile(
                                submission.file_path!,
                                submission.original_filename || 'video'
                              )}
                              className="gap-1"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteSubmission(submission.id, submission.file_path || undefined)}
                            className="gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoUpload;