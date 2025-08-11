import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const navigate = useNavigate();

  return (
    <header className="bg-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
      <div className="relative z-10 py-6 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-accent rounded-xl flex items-center justify-center shadow-[var(--shadow-glow)]">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Sentiment <span className="text-brand-green">CX</span>
            </h1>
          </div>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              className="btn-outline-light glow-effect"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
            <Button 
              className="btn-gradient glow-effect"
              onClick={() => navigate('/support')}
            >
              Suporte
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;