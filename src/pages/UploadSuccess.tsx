import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowLeft, Upload } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

export default function UploadSuccess() {
  const [searchParams] = useSearchParams();
  const [isVerified, setIsVerified] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // The verification happened in the verify-upload function
      setIsVerified(true);
      setMessage("Upload autorizado! Você pode agora fazer upload do seu vídeo.");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Upload Confirmado!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-muted-foreground">
              {message || "Seu upload foi verificado com sucesso. Agora você pode fazer upload do seu vídeo."}
            </p>
            
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link to="/upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Fazer Upload do Vídeo
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Início
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}