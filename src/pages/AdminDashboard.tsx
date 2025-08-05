import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Download, ExternalLink, Users, FileVideo, Link as LinkIcon } from "lucide-react";
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
  const { toast } = useToast();
  const navigate = useNavigate();

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
    
    // Calculate how many views have been paid for each submission across all payments
    const paidViewsPerSubmission = new Map<string, number>();
    payments.forEach(payment => {
      payment.submission_ids.forEach(submissionId => {
        const currentPaidViews = paidViewsPerSubmission.get(submissionId) || 0;
        // Divide the payment's total views equally among all submissions in that payment
        const viewsPerSubmission = payment.total_views / payment.submission_ids.length;
        paidViewsPerSubmission.set(submissionId, currentPaidViews + viewsPerSubmission);
      });
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