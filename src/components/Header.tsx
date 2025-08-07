import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="w-full py-4 px-6 bg-brand-dark-blue">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-nav font-semibold text-brand-white">
            Sentiment CX
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            size="sm"
            onClick={() => navigate('/login')}
            className="bg-brand-green text-brand-white hover:bg-brand-green/90 text-sm"
          >
            Login
          </Button>
          <Button 
            size="sm"
            className="bg-brand-green text-brand-white hover:bg-brand-green/90 text-sm"
          >
            Suporte
          </Button>
        </div>
      </nav>
    </header>
  );
};

export default Header;