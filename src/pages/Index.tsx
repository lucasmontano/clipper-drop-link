import { Button } from "@/components/ui/button";
import { Scissors } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

const Index = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      container.style.setProperty('--mouse-x', `${x}%`);
      container.style.setProperty('--mouse-y', `${y}%`);
    };

    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        '--mouse-x': '50%',
        '--mouse-y': '50%',
      } as React.CSSProperties}
    >
      {/* YouTube Channel Background */}
      <div className="absolute inset-0 w-full h-full">
        <div 
          className="w-full h-full"
          style={{
            background: `url('/lovable-uploads/212e0abb-aa3f-4645-8b86-5b3dba090171.png') center/cover`,
            filter: 'blur(8px)',
            maskImage: 'radial-gradient(circle 150px at var(--mouse-x) var(--mouse-y), transparent 50px, black 150px)',
            WebkitMaskImage: 'radial-gradient(circle 150px at var(--mouse-x) var(--mouse-y), transparent 50px, black 150px)',
            transform: 'scale(1.1)',
          }}
        />
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            background: `url('/lovable-uploads/212e0abb-aa3f-4645-8b86-5b3dba090171.png') center/cover`,
            filter: 'blur(0px)',
            maskImage: 'radial-gradient(circle 150px at var(--mouse-x) var(--mouse-y), black 50px, transparent 150px)',
            WebkitMaskImage: 'radial-gradient(circle 150px at var(--mouse-x) var(--mouse-y), black 50px, transparent 150px)',
          }}
        />
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* Content */}
      <div className="relative z-10 text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white mb-8">
            Lucas Montano
          </h1>
          <Link to="/auth">
            <Button size="lg" className="gap-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-300">
              <Scissors className="w-5 h-5" />
              Iniciar Clipagem
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
export default Index;