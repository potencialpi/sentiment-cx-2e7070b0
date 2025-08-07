import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const WelcomeSection = () => {
  const navigate = useNavigate();

  const handleStartNow = () => {
    navigate('/choose-plan');
  };

  return (
    <section className="bg-brand-white py-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-brand-dark-blue mb-8">
          Bem-vindo ao Sentiment CX
        </h1>
        
        <div className="space-y-6 mb-12">
          <p className="text-lg text-brand-dark-blue/80 max-w-3xl mx-auto">
            Transforme insights em resultados com nossa plataforma de pesquisas de mercado e análise de sentimentos powered by IA.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="text-center p-6">
              <h3 className="text-xl font-semibold text-brand-dark-blue mb-3">Start Quântico</h3>
              <p className="text-2xl font-bold text-brand-green mb-2">R$ 349/mês</p>
              <p className="text-sm text-brand-dark-blue/70">Ideal para pequenas empresas</p>
            </div>
            
            <div className="text-center p-6 bg-brand-green/5 rounded-lg border-2 border-brand-green">
              <h3 className="text-xl font-semibold text-brand-dark-blue mb-3">Vortex Neural</h3>
              <p className="text-2xl font-bold text-brand-green mb-2">R$ 649/mês</p>
              <p className="text-sm text-brand-dark-blue/70">Perfeito para médias empresas</p>
            </div>
            
            <div className="text-center p-6">
              <h3 className="text-xl font-semibold text-brand-dark-blue mb-3">Nexus Infinito</h3>
              <p className="text-2xl font-bold text-brand-green mb-2">R$ 1.249/mês</p>
              <p className="text-sm text-brand-dark-blue/70">Solução completa para grandes empresas</p>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={handleStartNow}
          className="bg-brand-green text-brand-white hover:bg-brand-green/90 px-8 py-4 text-lg font-semibold"
        >
          Comece Agora
        </Button>
      </div>
    </section>
  );
};

export default WelcomeSection;