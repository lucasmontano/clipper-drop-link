import { Button } from "@/components/ui/button";
import { Scissors } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
const Index = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [clickEffect, setClickEffect] = useState({
    active: false,
    x: 0,
    y: 0
  });
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * 100;
      const y = (e.clientY - rect.top) / rect.height * 100;
      container.style.setProperty('--mouse-x', `${x}%`);
      container.style.setProperty('--mouse-y', `${y}%`);
    };
    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, []);
  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 100;
    const y = (e.clientY - rect.top) / rect.height * 100;
    setClickEffect({
      active: true,
      x,
      y
    });

    // Navigate after animation completes
    setTimeout(() => {
      navigate('/auth');
    }, 600);
  };
  return <div ref={containerRef} className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{
    '--mouse-x': '50%',
    '--mouse-y': '50%'
  } as React.CSSProperties}>
      {/* YouTube Channel Background */}
      <div className="absolute inset-0 w-full h-full">
        {/* Blurred background */}
        <div className="w-full h-full" style={{
        background: `url('/lovable-uploads/212e0abb-aa3f-4645-8b86-5b3dba090171.png') center/cover`,
        filter: 'blur(8px)'
      }} />
        {/* Unblurred overlay that follows mouse */}
        <div className="absolute inset-0 w-full h-full" style={{
        background: `url('/lovable-uploads/212e0abb-aa3f-4645-8b86-5b3dba090171.png') center/cover`,
        filter: 'blur(0px)',
        maskImage: 'radial-gradient(circle 150px at var(--mouse-x) var(--mouse-y), black 50px, transparent 150px)',
        WebkitMaskImage: 'radial-gradient(circle 150px at var(--mouse-x) var(--mouse-y), black 50px, transparent 150px)'
      }} />
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* Content */}
      <div className="relative z-10 text-center space-y-6">
        <div className="space-y-4">
          
          <Button size="lg" onClick={handleButtonClick} className="gap-2 bg-primary/20 backdrop-blur-sm border border-primary/30 text-primary-foreground hover:bg-primary/30 transition-all duration-300 relative overflow-hidden" style={{
          '--click-x': `${clickEffect.x}%`,
          '--click-y': `${clickEffect.y}%`,
          maskImage: clickEffect.active ? `
                linear-gradient(45deg, black 0%, black calc(var(--click-x) - 2px), transparent calc(var(--click-x) - 1px), transparent calc(var(--click-x) + 1px), black calc(var(--click-x) + 2px), black 100%),
                linear-gradient(-45deg, black 0%, black calc(var(--click-y) - 2px), transparent calc(var(--click-y) - 1px), transparent calc(var(--click-y) + 1px), black calc(var(--click-y) + 2px), black 100%)
              ` : undefined,
          WebkitMaskImage: clickEffect.active ? `
                linear-gradient(45deg, black 0%, black calc(var(--click-x) - 2px), transparent calc(var(--click-x) - 1px), transparent calc(var(--click-x) + 1px), black calc(var(--click-x) + 2px), black 100%),
                linear-gradient(-45deg, black 0%, black calc(var(--click-y) - 2px), transparent calc(var(--click-y) - 1px), transparent calc(var(--click-y) + 1px), black calc(var(--click-y) + 2px), black 100%)
              ` : undefined,
          animation: clickEffect.active ? 'button-cut 0.6s ease-out forwards' : undefined
        } as React.CSSProperties}>
            <Scissors className="w-5 h-5" />
            Iniciar Clipagem
          </Button>
        </div>
      </div>
    </div>;
};
export default Index;