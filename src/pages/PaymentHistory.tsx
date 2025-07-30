import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ArrowLeft, DollarSign } from "lucide-react";
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

interface Payment {
  id: string;
  total_views: number;
  payment_amount: number;
  payment_date: string;
  status: string;
  created_at: string;
}

const PaymentHistory = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
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
          loadPayments();
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
        loadPayments();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPayments(data || []);
    } catch (error: any) {
      console.error('Error loading payments:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de pagamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatPayment = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600">Pendente</Badge>;
      case 'paid':
        return <Badge variant="default" className="text-green-600">Pago</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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

  const totalEarnings = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.payment_amount, 0);
  const pendingEarnings = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.payment_amount, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-3xl font-bold flex items-center gap-2">
                <DollarSign className="w-8 h-8" />
                Histórico de Pagamentos
              </CardTitle>
              <CardDescription>
                Bem-vindo, {user.email}! Acompanhe seus pagamentos.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/upload')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
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
                    <p className="text-sm font-medium text-muted-foreground">Total de Pagamentos</p>
                    <p className="text-2xl font-bold">{payments.length}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Recebido</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatPayment(totalEarnings)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pendente</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatPayment(pendingEarnings)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Seus Pagamentos</CardTitle>
              <CardDescription>
                Histórico completo de todos os seus pagamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data do Pagamento</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                            {payment.total_views.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-green-600">
                              {formatPayment(payment.payment_amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.status)}
                          </TableCell>
                          <TableCell>
                            {formatDate(payment.created_at)}
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

export default PaymentHistory;