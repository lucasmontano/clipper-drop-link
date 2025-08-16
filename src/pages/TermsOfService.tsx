import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Início
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Termos de Serviço
            </CardTitle>
            <p className="text-center text-muted-foreground">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-8 p-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">1. Aceitação dos Termos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Ao acessar e usar o Clipper, você concorda em cumprir e estar vinculado a estes Termos de Serviço. 
                Se você não concordar com qualquer parte destes termos, não poderá usar nosso serviço.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">2. Descrição do Serviço</h2>
              <p className="text-muted-foreground leading-relaxed">
                O Clipper é uma plataforma que permite aos usuários enviar vídeos e receber pagamentos 
                baseados no número de visualizações obtidas. Nosso serviço facilita a conexão entre 
                criadores de conteúdo e oportunidades de monetização.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">3. Política de Pagamentos</h2>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 mb-4">
                <h3 className="text-lg font-semibold mb-3 text-destructive">Limites e Investigações</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-destructive font-bold">•</span>
                    <span><strong>Limite de Pagamento:</strong> O valor máximo por submissão de vídeo é de <strong>$10 USD</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive font-bold">•</span>
                    <span><strong>Direito de Investigação:</strong> Reservamo-nos o direito de investigar e negar pagamentos para valores acima de $10 por submissão.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-destructive font-bold">•</span>
                    <span><strong>Verificação de Legitimidade:</strong> Todas as visualizações e métricas estão sujeitas a verificação para garantir a autenticidade.</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3 text-muted-foreground">
                <p><strong>Processamento de Pagamentos:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Os pagamentos são processados mediante solicitação do administrador</li>
                  <li>Você será notificado por email quando um pagamento for solicitado</li>
                  <li>É necessário fornecer dados válidos do PayPal para receber pagamentos</li>
                  <li>Pagamentos podem levar de 3-7 dias úteis para serem processados</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">4. Responsabilidades do Usuário</h2>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>Enviar apenas conteúdo próprio ou para o qual possui direitos autorais</li>
                <li>Não enviar conteúdo ilegal, ofensivo ou que viole direitos de terceiros</li>
                <li>Manter informações de contato atualizadas</li>
                <li>Não tentar manipular métricas de visualização artificialmente</li>
                <li>Respeitar os limites de upload diários estabelecidos na plataforma</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">5. Propriedade Intelectual</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Você mantém todos os direitos sobre o conteúdo que envia. No entanto, ao usar nosso serviço, 
                  você nos concede uma licença limitada para hospedar, exibir e distribuir seu conteúdo 
                  conforme necessário para operar a plataforma.
                </p>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 text-primary">Direitos de Repostagem</h3>
                  <p>
                    Ao enviar conteúdo para o Clipper, você concede expressamente a <strong>Lucas Montano</strong> 
                    o direito de repostar, compartilhar e promover seus vídeos em suas redes sociais 
                    (incluindo mas não limitado a Instagram, TikTok, YouTube, Twitter/X e outras plataformas). 
                    Esta autorização é necessária para a promoção da plataforma e de seu conteúdo.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">6. Suspensão e Rescisão</h2>
              <p className="text-muted-foreground leading-relaxed">
                Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos, 
                engajem em atividades fraudulentas ou comprometam a integridade da plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">7. Limitação de Responsabilidade</h2>
              <p className="text-muted-foreground leading-relaxed">
                O Clipper não se responsabiliza por perdas diretas ou indiretas resultantes do uso 
                da plataforma. Nosso serviço é fornecido "como está" sem garantias explícitas ou implícitas.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">8. Privacidade</h2>
              <p className="text-muted-foreground leading-relaxed">
                Protegemos suas informações pessoais de acordo com nossa Política de Privacidade. 
                Coletamos apenas as informações necessárias para operar o serviço e processar pagamentos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">9. Modificações dos Termos</h2>
              <p className="text-muted-foreground leading-relaxed">
                Podemos atualizar estes Termos de Serviço ocasionalmente. Usuários serão notificados 
                sobre mudanças significativas por email ou através da plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">10. Contato</h2>
              <p className="text-muted-foreground leading-relaxed">
                Para dúvidas sobre estes Termos de Serviço, entre em contato conosco em{" "}
                <a href="mailto:comercial@lucasmontano.com" className="text-primary hover:underline">
                  comercial@lucasmontano.com
                </a>
              </p>
            </section>

            <div className="border-t pt-6 mt-8">
              <p className="text-center text-sm text-muted-foreground">
                Ao continuar usando o Clipper, você confirma que leu, entendeu e concorda com estes Termos de Serviço.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;