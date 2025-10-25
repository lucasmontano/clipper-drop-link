import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogOut, Link, Trash2, Download, ExternalLink, Youtube, Instagram, Twitter, Facebook, Linkedin, Globe, Edit, Check, X } from "lucide-react";
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
  views: number | null;
  payment_amount: number | null;
  clip_type: string | null;
  created_at: string;
}

const VideoUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [views, setViews] = useState<string>('');
  const [clipType, setClipType] = useState<string>('');
  const [editingSubmission, setEditingSubmission] = useState<string | null>(null);
  const [editViews, setEditViews] = useState<string>('');
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
      
      setUserSubmissions((data || []).map(submission => ({
        ...submission,
        views: (submission as any).views || 0,
        payment_amount: (submission as any).payment_amount || 0,
        clip_type: (submission as any).clip_type || null
      })));
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

  // Separate effect to load submissions when user changes
  useEffect(() => {
    if (user) {
      loadUserSubmissions();
    }
  }, [user]);

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

  const handleViewsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setViews(e.target.value);
  };

  const calculatePayment = (viewCount: number, clipType?: string): number => {
    let ratePerThousand;
    if (clipType === 'perssua') {
      ratePerThousand = 0.5; // $0.50 per 1000 views for Perssua
    } else if (clipType === 'lucas_montano') {
      ratePerThousand = 0.25; // $0.25 per 1000 views for Lucas Montano
    } else {
      ratePerThousand = 0.5; // $0.50 per 1000 views for others
    }
    const calculatedPayment = Math.round((viewCount / 1000) * ratePerThousand * 100) / 100; // rounded to 2 decimals
    return Math.min(calculatedPayment, 10); // Cap at $10 per video
  };

  const formatPayment = (amount: number | null): string => {
    if (!amount) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  const getClipTypeName = (clipType: string | null): string => {
    if (clipType === 'perssua') return 'Perssua';
    if (clipType === 'lucas_montano') return 'Lucas Montano';
    return 'N/A';
  };

  const getClipGuidelines = (clipType: string): string => {
    if (clipType === 'perssua') {
      return 'Faça um Clip sobre o Perssua seguindo um roteiro simples e criativo. Uma ideia para apresentar o software é começar falando de um problema, e comentar que um amigo recomendou o Perssua, nesse momento tu pode gravar o Perssua sendo utilizado e narrar como utilizou.';
    }
    if (clipType === 'lucas_montano') {
      return 'Faça um Clip de qualquer video publico do canal Lucas Montano. É importante que no clip o Lucas Montano esteja ou "montano" algo ou ensinando algo. As pessoas gostam muito quando ele desenha ou escreve algum código. Adicione o link do vídeo original na descrição e mencione (Lucas Montano) no título.';
    }
    return '';
  };

  const getPaymentInfo = (clipType: string): string => {
    if (clipType === 'perssua') {
      return '$0.50 por mil views (máximo $10 por vídeo)';
    }
    if (clipType === 'lucas_montano') {
      return '$0.25 por mil visualizações na sua rede social (máximo $10 por vídeo)';
    }
    return '';
  };

  const startEditViews = (submissionId: string, currentViews: number) => {
    setEditingSubmission(submissionId);
    setEditViews(currentViews.toString());
  };

  const cancelEditViews = () => {
    setEditingSubmission(null);
    setEditViews('');
  };

  const updateViews = async (submissionId: string) => {
    if (!editViews || isNaN(parseInt(editViews))) {
      toast({
        title: "Erro",
        description: "Digite um número válido de visualizações.",
        variant: "destructive",
      });
      return;
    }

    try {
      const viewCount = parseInt(editViews);
      const paymentAmount = calculatePayment(viewCount, clipType);

      const { error } = await supabase
        .from('video_submissions')
        .update({
          views: viewCount,
          payment_amount: paymentAmount
        } as any)
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: "Views atualizadas",
        description: `Visualizações atualizadas para ${viewCount.toLocaleString()}.`,
      });

      // Reset edit state
      setEditingSubmission(null);
      setEditViews('');

      // Reload submissions
      await loadUserSubmissions();
    } catch (error: any) {
      console.error('Error updating views:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar as visualizações.",
        variant: "destructive",
      });
    }
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
      
      // Calculate payment based on views
      const viewCount = parseInt(views) || 0;
      const paymentAmount = calculatePayment(viewCount, clipType);
      
      // Save URL submission to database
      const { data: submissionData, error: submissionError } = await supabase
        .from('video_submissions')
        .insert({
          user_id: user.id,
          user_email: userEmail,
          submission_type: 'url_link',
          video_url: videoUrl,
          views: viewCount,
          payment_amount: paymentAmount,
          clip_type: clipType,
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

      toast({
        title: "Submissão concluída!",
        description: `Seu link de vídeo foi salvo com sucesso. Você tem ${rateLimitResult.remaining_attempts} submissões restantes hoje.`,
      });

      // Reset form
      setVideoUrl('');
      setViews('');
      setClipType('');
      
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
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">
                Adicionar publicação feita
              </CardTitle>
              <CardDescription>
                Bem-vindo, {user.email}!
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/payments')}
                className="gap-2"
              >
                <span>💰</span>
                Meus Pagamentos
              </Button>
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
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Clip Type Selection */}
          <div className="space-y-4">
            <Label>Selecione o tipo de clip</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setClipType('perssua')}
                className={`relative p-6 border-2 rounded-lg transition-all ${
                  clipType === 'perssua' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <img 
                    src="/lovable-uploads/32c20307-4245-4a82-bee7-2c09b9c83dce.png" 
                    alt="Perssua" 
                    className="w-16 h-16 object-contain"
                  />
                  <span className="font-medium">Perssua</span>
                </div>
                {clipType === 'perssua' && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground text-xs">✓</span>
                  </div>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setClipType('lucas_montano')}
                className={`relative p-6 border-2 rounded-lg transition-all ${
                  clipType === 'lucas_montano' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <img 
                    src="/lovable-uploads/849a3b77-4aee-422e-8ace-2b0608b7194e.png" 
                    alt="Lucas Montano" 
                    className="w-16 h-16 object-contain rounded-full"
                  />
                  <span className="font-medium">Lucas Montano</span>
                </div>
                {clipType === 'lucas_montano' && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground text-xs">✓</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Guidelines and Payment Info - Show after clip type is selected */}
          {clipType && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Orientações para {getClipTypeName(clipType)}</h3>
                <p className="text-sm text-blue-800 mb-3">{getClipGuidelines(clipType)}</p>
                 <div className="bg-green-50 border border-green-200 rounded-md p-3">
                   <h4 className="font-medium text-green-900 mb-1">Pagamento:</h4>
                   <p className="text-sm text-green-800 mb-2">{getPaymentInfo(clipType)}</p>
                   <div className="bg-orange-50 border border-orange-200 rounded-md p-2 mb-2">
                     <p className="text-xs text-orange-800 font-medium">
                       ⚠️ Limite máximo: $10 por submissão
                     </p>
                   </div>
                   <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                     <p className="text-xs text-yellow-800 font-medium">
                       📋 Requisito: Você precisa ter uma empresa e conseguir gerar uma fatura via PayPal para sacar o dinheiro
                     </p>
                   </div>
                 </div>

                {/* Assets Section for Perssua */}
                {clipType === 'perssua' && (
                  <div className="mt-6 bg-white border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-3">Assets para Clippers</h4>
                    <p className="text-sm text-blue-800 mb-4">
                      Use estes recursos para criar clips profissionais do Perssua:
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {/* Perssua Logo */}
                      <div className="bg-gray-50 p-3 rounded-lg border">
                        <img 
                          src="/lovable-uploads/88a35bb9-aa57-4e3d-b944-40f6e598d38c.png" 
                          alt="Perssua Logo" 
                          className="w-full h-12 object-contain mb-2"
                        />
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-700 mb-1">Logo Perssua</p>
                          <a 
                            href="/lovable-uploads/88a35bb9-aa57-4e3d-b944-40f6e598d38c.png" 
                            download="perssua-logo.png"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </a>
                        </div>
                      </div>

                      {/* Recording Interface 1 */}
                      <div className="bg-gray-50 p-3 rounded-lg border">
                        <img 
                          src="/lovable-uploads/fc3568b6-9b94-4ddc-beb2-661f203ad9fd.png" 
                          alt="Recording Interface" 
                          className="w-full h-12 object-contain mb-2"
                        />
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-700 mb-1">Interface de Gravação</p>
                          <a 
                            href="/lovable-uploads/fc3568b6-9b94-4ddc-beb2-661f203ad9fd.png" 
                            download="recording-interface-1.png"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </a>
                        </div>
                      </div>

                      {/* Recording Interface 2 */}
                      <div className="bg-gray-50 p-3 rounded-lg border">
                        <img 
                          src="/lovable-uploads/f5569895-f9cc-4003-9a02-38f25b9f2347.png" 
                          alt="Recording Interface 2" 
                          className="w-full h-12 object-contain mb-2"
                        />
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-700 mb-1">Interface Desktop</p>
                          <a 
                            href="/lovable-uploads/f5569895-f9cc-4003-9a02-38f25b9f2347.png" 
                            download="recording-interface-2.png"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </a>
                        </div>
                      </div>

                      {/* Controls Interface */}
                      <div className="bg-gray-50 p-3 rounded-lg border">
                        <img 
                          src="/lovable-uploads/205fb8eb-b8e2-4ba0-8bdf-1d3cce4f8dd9.png" 
                          alt="Controls Interface" 
                          className="w-full h-12 object-contain mb-2"
                        />
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-700 mb-1">Controles</p>
                          <a 
                            href="/lovable-uploads/205fb8eb-b8e2-4ba0-8bdf-1d3cce4f8dd9.png" 
                            download="controls-interface.png"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </a>
                        </div>
                      </div>

                      {/* Recording Bar */}
                      <div className="bg-gray-50 p-3 rounded-lg border">
                        <img 
                          src="/lovable-uploads/56faf8d1-7354-4e4d-be12-7b80497c0f1b.png" 
                          alt="Recording Bar" 
                          className="w-full h-12 object-contain mb-2"
                        />
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-700 mb-1">Barra de Gravação</p>
                          <a 
                            href="/lovable-uploads/56faf8d1-7354-4e4d-be12-7b80497c0f1b.png" 
                            download="recording-bar.png"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </a>
                        </div>
                      </div>

                      {/* Integrations */}
                      <div className="bg-gray-50 p-3 rounded-lg border">
                        <img 
                          src="/lovable-uploads/7e229fd9-bf1c-4f14-88e2-137406dfcfa8.png" 
                          alt="Platform Integrations" 
                          className="w-full h-12 object-contain mb-2"
                        />
                        <div className="text-center">
                          <p className="text-xs font-medium text-gray-700 mb-1">Integrações</p>
                          <a 
                            href="/lovable-uploads/7e229fd9-bf1c-4f14-88e2-137406dfcfa8.png" 
                            download="platform-integrations.png"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                      <p className="text-xs text-blue-800">
                        💡 <strong>Dica:</strong> Use estes assets para mostrar como o Perssua funciona em seus clips. 
                        Demonstre a facilidade de uso e as integrações com plataformas populares.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Social Media URL Input - Only show after clip type is selected */}
          {clipType && (
            <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Link da postagem</Label>
              <div className="relative">
                <Input
                  id="videoUrl"
                  type="url"
                  value={videoUrl}
                  onChange={handleUrlChange}
                  placeholder="Instagram/Reels, TikTok ou YouTube Shorts"
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

            <div className="space-y-2">
              <Label htmlFor="views">Número de visualizações</Label>
              <Input
                id="views"
                type="number"
                value={views}
                onChange={handleViewsChange}
                placeholder="Ex: 1500"
                min="0"
              />
              {views && !isNaN(parseInt(views)) && parseInt(views) > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Pagamento calculado: {formatPayment(calculatePayment(parseInt(views), clipType))}
                  </div>
                   {parseInt(views) >= 10000 && (
                     <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                       <p className="text-sm text-orange-800 font-medium">
                         💡 Pagamento limitado ao máximo de $10 por vídeo. 
                         Parabéns pelo excelente desempenho!
                       </p>
                     </div>
                   )}
                </div>
              )}
            </div>

            <Button
              onClick={uploadFromUrl}
              disabled={isUploading || !videoUrl || !clipType}
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
          )}
        </CardContent>
      </Card>

      {/* User Submissions */}
      <Card className="max-w-6xl mx-auto">
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
                    <TableHead>Clip</TableHead>
                    <TableHead>Arquivo/URL</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Pagamento</TableHead>
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
                        <Badge variant="outline">
                          {getClipTypeName(submission.clip_type)}
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
                        {editingSubmission === submission.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editViews}
                              onChange={(e) => setEditViews(e.target.value)}
                              className="w-20 text-sm"
                              min="0"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateViews(submission.id)}
                              className="p-1 h-6 w-6"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditViews}
                              className="p-1 h-6 w-6"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{submission.views ? submission.views.toLocaleString() : '0'}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditViews(submission.id, submission.views || 0)}
                              className="p-1 h-6 w-6"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatPayment(submission.payment_amount)}
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