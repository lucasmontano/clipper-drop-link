// Update this page (the content is just a fallback if you fail to update the page)

import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold mb-4">Sistema de Upload de Vídeos</h1>
        <p className="text-xl text-muted-foreground">Para Clippers</p>
        <div className="space-y-4">
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              <Upload className="w-5 h-5" />
              Fazer Login para Upload
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
