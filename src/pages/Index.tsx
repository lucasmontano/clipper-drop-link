// Update this page (the content is just a fallback if you fail to update the page)

import { Button } from "@/components/ui/button";
import { Scissors } from "lucide-react";
import { Link } from "react-router-dom";
const Index = () => {
  return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold mb-4">Sistema de Upload de Vídeos</h1>
        
        <div className="space-y-4">
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              <Scissors className="w-5 h-5" />
              Iniciar Clipagem
            </Button>
          </Link>
        </div>
      </div>
    </div>;
};
export default Index;