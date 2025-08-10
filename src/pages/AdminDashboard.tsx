import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Download, ExternalLink, Users, FileVideo, Link as LinkIcon, Trash2, Eye } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { Session, User } from '@supabase/supabase-js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface PaymentSummary {
  email: string;
  totalViews: number;
  totalPayment: number;
  paidAmount: number;
  pendingPayment: number;
  submissionCount: number;
  submissionIds: string[];
  pendingSubmissionIds: string[];
  pendingViews: number;
}

interface Payment {
  id: string;
  user_email: string;
  total_views: number;
  payment_amount: number;
  payment_date: string;
  status: string;
  submission_ids: string[];
}

const AdminDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [paymentSummaries, setPaymentSummaries] = useState<PaymentSummary[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [deletingSubmission, setDeletingSubmission] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const duplicateGroups = useMemo(() => {
    const map = new Map<string, VideoSubmission[]>();
    for (const s of submissions) {
      const link = s.video_url?.trim();
      if (!link) continue;
      const arr = map.get(link) || [];
      arr.push(s);
      map.set(link, arr);
    }
    return Array.from(map.entries())
      .filter(([, arr]) => arr.length > 1)
      .map(([link, items]) => ({ link, items }));
  }, [submissions]);

  const linkSubmissions = useMemo(() => (
    submissions
      .filter((s) => (s.video_url || '').trim())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  ), [submissions]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate('/auth');
        } else {
          checkAdminAccess(session.user);
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
        checkAdminAccess(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminAccess = (user: User) => {
    const adminEmail = "comercial@lucasmontano.com";
    if (user.email === adminEmail) {
      setIsAdmin(true);
      loadSubmissions();
    } else {
      setIsAdmin(false);
      setLoading(false);
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate('/upload');
    }
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      
      // Load submissions
      const { data, error } = await supabase
        .from('video_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const submissionsData = (data || []).map(submission => ({
        ...submission,
        views: (submission as any).views || 0,
        payment_amount: (submission as any).payment_amount || 0,
        clip_type: (submission as any).clip_type || null
      }));
      
      // Load payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      
      setSubmissions(submissionsData);
      setPayments(paymentsData || []);
      calculatePaymentSummaries(submissionsData, paymentsData || []);
    } catch (error: any) {
      console.error('Error loading submissions:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as submissões.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePaymentSummaries = (submissions: VideoSubmission[], payments: Payment[]) => {
    const summaryMap = new Map<string, PaymentSummary>();
    
    // Calculate how many views have been paid for each submission
    const paidViewsPerSubmission = new Map<string, number>();
    
    payments.forEach(payment => {
      // Calculate the sum of current views for all submissions in this payment
      const submissionsInPayment = payment.submission_ids
        .map(id => submissions.find(s => s.id === id))
        .filter(Boolean) as VideoSubmission[];
      
      const totalCurrentViews = submissionsInPayment.reduce((sum, sub) => sum + (sub.views || 0), 0);
      
      // If payment total views matches current views total, mark all as fully paid
      // Otherwise, distribute proportionally
      if (totalCurrentViews === payment.total_views) {
        // Payment covers all current views for these submissions
        submissionsInPayment.forEach(submission => {
          const currentPaidViews = paidViewsPerSubmission.get(submission.id) || 0;
          paidViewsPerSubmission.set(submission.id, currentPaidViews + (submission.views || 0));
        });
      } else {
        // Distribute payment views proportionally
        submissionsInPayment.forEach(submission => {
          const currentPaidViews = paidViewsPerSubmission.get(submission.id) || 0;
          const proportionalViews = (submission.views || 0) * (payment.total_views / totalCurrentViews);
          paidViewsPerSubmission.set(submission.id, currentPaidViews + proportionalViews);
        });
      }
    });
    
    submissions.forEach(submission => {
      if (!submission.user_email) return;
      
      const email = submission.user_email;
      const currentViews = submission.views || 0;
      const paidViews = paidViewsPerSubmission.get(submission.id) || 0;
      const pendingViews = Math.max(0, currentViews - paidViews);
      const ratePerView = submission.views ? (submission.payment_amount || 0) / submission.views : 0;
      const pendingPayment = pendingViews * ratePerView;
      const paidPayment = paidViews * ratePerView;
      
      if (summaryMap.has(email)) {
        const existing = summaryMap.get(email)!;
        const updatedPendingSubmissionIds = pendingViews > 0 
          ? [...existing.pendingSubmissionIds, submission.id]
          : existing.pendingSubmissionIds;
        
        summaryMap.set(email, {
          email,
          totalViews: existing.totalViews + currentViews,
          totalPayment: existing.totalPayment + (submission.payment_amount || 0),
          paidAmount: existing.paidAmount + paidPayment,
          pendingPayment: existing.pendingPayment + pendingPayment,
          submissionCount: existing.submissionCount + 1,
          submissionIds: [...existing.submissionIds, submission.id],
          pendingSubmissionIds: updatedPendingSubmissionIds,
          pendingViews: existing.pendingViews + pendingViews
        });
      } else {
        summaryMap.set(email, {
          email,
          totalViews: currentViews,
          totalPayment: submission.payment_amount || 0,
          paidAmount: paidPayment,
          pendingPayment: pendingPayment,
          submissionCount: 1,
          submissionIds: [submission.id],
          pendingSubmissionIds: pendingViews > 0 ? [submission.id] : [],
          pendingViews: pendingViews
        });
      }
    });
    
    const summaries = Array.from(summaryMap.values())
      .sort((a, b) => b.pendingPayment - a.pendingPayment);
    
    setPaymentSummaries(summaries);
  };

  const handleCreatePayment = async (summary: PaymentSummary) => {
    if (summary.pendingPayment <= 0) {
      toast({
        title: "Erro",
        description: "Não há valor pendente para este usuário.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingPayment(summary.email);
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          userEmail: summary.email,
          totalViews: summary.pendingViews,
          paymentAmount: summary.pendingPayment,
          submissionIds: summary.pendingSubmissionIds
        }
      });

      if (error) throw error;

      toast({
        title: "Pagamento criado",
        description: `Email de pagamento enviado para ${summary.email}`,
      });

      // Reload data
      loadSubmissions();
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o pagamento.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'paid' })
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "Pagamento marcado como pago.",
      });

      // Reload data
      loadSubmissions();
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pagamento.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      
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

  const handleDeleteSubmission = async (submissionId: string) => {
    try {
      setDeletingSubmission(submissionId);
      
      console.log('Attempting to delete submission:', submissionId);
      
      // Get submission details for cleanup
      const submission = submissions.find(s => s.id === submissionId);
      console.log('Found submission:', submission);
      
      // Delete from database
      const { error } = await supabase
        .from('video_submissions')
        .delete()
        .eq('id', submissionId);

      console.log('Delete result:', { error });
      
      if (error) throw error;

      // If it's a file upload, also delete from storage
      if (submission?.submission_type === 'file_upload' && submission.file_path) {
        const { error: storageError } = await supabase.storage
          .from('video-uploads')
          .remove([submission.file_path]);
        
        if (storageError) {
          console.warn('Failed to delete file from storage:', storageError);
        }
      }

      toast({
        title: "Submissão deletada",
        description: "A submissão foi removida com sucesso.",
      });

      // Reload data
      loadSubmissions();
    } catch (error: any) {
      console.error('Error deleting submission:', error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a submissão.",
        variant: "destructive",
      });
    } finally {
      setDeletingSubmission(null);
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

  const formatPayment = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const getClipTypeName = (clipType: string | null): string => {
    if (clipType === 'perssua') return 'Perssua';
    if (clipType === 'lucas_montano') return 'Lucas Montano';
    return 'N/A';
  };

  const getYouTubeId = (url: string): string | null => {
    try {
      const patterns = [
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      ];
      for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
      }
      const u = new URL(url);
      const v = u.searchParams.get('v');
      return v || null;
    } catch {
      return null;
    }
  };

  const isDirectVideo = (url: string) => /\.(mp4|webm|mov|mkv|avi)$/i.test(url);

  const getEmbedForUrl = (url: string) => {
    const yt = getYouTubeId(url);
    if (yt) {
      return (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${yt}`}
          title="YouTube preview"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    if (isDirectVideo(url)) {
      return (
        <video className="absolute inset-0 w-full h-full object-cover" src={url} controls preload="metadata" />
      );
    }
    return (
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm px-4 text-center">
        Prévia indisponível
      </div>
    );
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Acesso Negado</CardTitle>
            <CardDescription className="text-center">
              Você não tem permissão para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-7xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-3xl font-bold flex items-center gap-2">
                <Users className="w-8 h-8" />
                Dashboard Administrativo
              </CardTitle>
              <CardDescription>
                Bem-vindo, {user.email}! Gerencie todas as submissões de vídeo.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/upload')}
                className="gap-2"
              >
                <FileVideo className="w-4 h-4" />
                Upload
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
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Submissões</p>
                    <p className="text-2xl font-bold">{submissions.length}</p>
                  </div>
                  <FileVideo className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Uploads de Arquivo</p>
                    <p className="text-2xl font-bold">
                      {submissions.filter(s => s.submission_type === 'file_upload').length}
                    </p>
                  </div>
                  <Download className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total a Pagar</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatPayment(paymentSummaries.reduce((sum, p) => sum + p.totalPayment, 0))}
                    </p>
                  </div>
                  <LinkIcon className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Links Duplicados */}
          <Card>
            <CardHeader>
              <CardTitle>Links Duplicados</CardTitle>
              <CardDescription>
                Verifique envios com a mesma URL de vídeo. Não permitimos links duplicados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {duplicateGroups.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground border rounded-md">
                  Tudo certo! Nenhum link duplicado encontrado agora.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Link</TableHead>
                        <TableHead>Duplicatas</TableHead>
                        <TableHead>Submissões</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {duplicateGroups.map((group) => (
                        <TableRow key={group.link}>
                          <TableCell className="max-w-[340px] align-top">
                            <a
                              href={group.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline break-all flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              {group.link}
                            </a>
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline">{group.items.length}</Badge>
                          </TableCell>
                          <TableCell>
                            <ul className="space-y-1">
                              {group.items.map((item) => (
                                <li key={item.id} className="text-sm text-muted-foreground">
                                  <span className="font-medium">{item.user_email || 'N/A'}</span>
                                  {" • "}{formatDate(item.created_at)}
                                  {" • ID "}{item.id.slice(0,8)}
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Galeria de Links */}
          <Card>
            <CardHeader>
              <CardTitle>Galeria de Links</CardTitle>
              <CardDescription>Pré-visualização dos links enviados e seus views</CardDescription>
            </CardHeader>
            <CardContent>
              {linkSubmissions.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground border rounded-md">
                  Nenhum link enviado até o momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {linkSubmissions.map((s) => (
                    <div key={s.id} className="rounded-md border overflow-hidden bg-card">
                      <div className="relative pb-[56.25%] bg-muted">
                        {getEmbedForUrl(s.video_url!)}
                      </div>
                      <div className="p-3 flex items-center justify-between gap-2">
                        <a
                          href={s.video_url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate max-w-[75%] flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {s.video_url}
                        </a>
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Eye className="w-4 h-4" />
                          {s.views ? s.views.toLocaleString() : 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Summary by Email */}
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos por Email</CardTitle>
              <CardDescription>
                Resumo dos valores a pagar para cada usuário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Submissões</TableHead>
                        <TableHead>Total de Views</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Valor Pago</TableHead>
                        <TableHead>Pendente</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentSummaries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            Nenhum pagamento encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        paymentSummaries.map((summary) => (
                          <TableRow key={summary.email}>
                            <TableCell className="font-medium">
                              {summary.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {summary.submissionCount}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {summary.totalViews.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-green-600">
                                {formatPayment(summary.totalPayment)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-blue-600">
                                {formatPayment(summary.paidAmount)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-orange-600">
                                {formatPayment(summary.pendingPayment)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {summary.pendingPayment > 0 && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCreatePayment(summary)}
                                  disabled={processingPayment === summary.email}
                                  className="gap-1"
                                >
                                  {processingPayment === summary.email ? 'Processando...' : 'Pagar'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Pagamentos</CardTitle>
              <CardDescription>
                Todos os pagamentos criados com status atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhum pagamento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {formatDate(payment.payment_date)}
                          </TableCell>
                          <TableCell>
                            {payment.user_email}
                          </TableCell>
                          <TableCell>
                            {payment.total_views.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-green-600">
                              {formatPayment(payment.payment_amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={payment.status === 'paid' ? 'default' : 'outline'}
                              className={payment.status === 'paid' ? 'text-green-600' : 'text-orange-600'}
                            >
                              {payment.status === 'paid' ? 'Pago' : 'Pendente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payment.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAsPaid(payment.id)}
                                className="gap-1"
                              >
                                ✓ Marcar Pago
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Submissions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Todas as Submissões</CardTitle>
              <CardDescription>
                Lista completa de vídeos enviados pelos usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Clip</TableHead>
                      <TableHead>Arquivo/URL</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          Nenhuma submissão encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      submissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell className="font-medium">
                            {formatDate(submission.created_at)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {submission.user_email || 'Email não disponível'}
                            </span>
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
                              <a
                                href={submission.video_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Ver Link
                              </a>
                            )}
                          </TableCell>
                          <TableCell>
                            {submission.views ? submission.views.toLocaleString() : '0'}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-green-600">
                              {formatPayment(submission.payment_amount || 0)}
                            </span>
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
                               <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                   <Button
                                     size="sm"
                                     variant="destructive"
                                     className="gap-1"
                                     disabled={deletingSubmission === submission.id}
                                   >
                                     <Trash2 className="w-3 h-3" />
                                     {deletingSubmission === submission.id ? 'Deletando...' : 'Deletar'}
                                   </Button>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent>
                                   <AlertDialogHeader>
                                     <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                     <AlertDialogDescription>
                                       Tem certeza que deseja deletar esta submissão? Esta ação não pode ser desfeita.
                                       {submission.submission_type === 'file_upload' && ' O arquivo também será removido do armazenamento.'}
                                     </AlertDialogDescription>
                                   </AlertDialogHeader>
                                   <AlertDialogFooter>
                                     <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                     <AlertDialogAction
                                       onClick={() => handleDeleteSubmission(submission.id)}
                                       className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                     >
                                       Deletar
                                     </AlertDialogAction>
                                   </AlertDialogFooter>
                                 </AlertDialogContent>
                               </AlertDialog>
                             </div>
                           </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;