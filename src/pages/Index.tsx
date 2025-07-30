import { Button } from "@/components/ui/button";
import { Scissors } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const Index = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [clickEffect, setClickEffect] = useState({ active: false, x: 0, y: 0 });

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

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setClickEffect({ active: true, x, y });
    
    // Navigate after animation completes
    setTimeout(() => {
      navigate('/auth');
    }, 600);
  };

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
            filter: `blur(calc(8px * (1 - radial-gradient(circle 150px at var(--mouse-x) var(--mouse-y), 1 50px, 0 150px))))`,
            maskImage: 'radial-gradient(circle 150px at var(--mouse-x) var(--mouse-y), transparent 50px, black 150px)',
            WebkitMaskImage: 'radial-gradient(circle 150px at var(--mouse-x) var(--mouse-y), transparent 50px, black 150px)',
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
          <Button 
            size="lg" 
            onClick={handleButtonClick}
            className="gap-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-300 relative overflow-hidden"
            style={{
              '--click-x': `${clickEffect.x}%`,
              '--click-y': `${clickEffect.y}%`,
            } as React.CSSProperties}
          >
            {/* Cut effect overlay */}
            {clickEffect.active && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `
                    linear-gradient(45deg, transparent 0%, transparent 49%, #ff4444 49.5%, #ff4444 50.5%, transparent 51%, transparent 100%),
                    linear-gradient(-45deg, transparent 0%, transparent 49%, #ff4444 49.5%, #ff4444 50.5%, transparent 51%, transparent 100%)
                  `,
                  transformOrigin: `${clickEffect.x}% ${clickEffect.y}%`,
                  animation: 'cut-effect 0.6s ease-out forwards',
                }}
              />
            )}
            <Scissors className="w-5 h-5" />
            Iniciar Clipagem
          </Button>
        </div>
      </div>
    </div>
  );
};
export default Index;