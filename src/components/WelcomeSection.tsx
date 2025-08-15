import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function WelcomeSection() {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);

  // Definição dos planos com preços mensais e anuais
  const plans = [
    {
      name: 'Start Quântico',
      monthlyPrice: 349,
      yearlyPrice: 3499, // 15% desconto
      description: 'Perfeito para começar',
      icon: 'S',
      gradient: 'bg-gradient-to-br from-brand-purple to-brand-dark-blue',
      features: [
        'Até 5 questões por pesquisa',
        '100 respostas por pesquisa',
        '2 pesquisas por mês',
        'Análise estatística básica'
      ]
    },
    {
      name: 'Vortex Neural',
      monthlyPrice: 649,
      yearlyPrice: 6199, // 15% desconto
      description: 'Para empresas em crescimento',
      icon: 'V',
      gradient: 'bg-gradient-accent',
      isPopular: true,
      features: [
        'Até 10 questões por pesquisa',
        '250 respostas por pesquisa',
        '4 pesquisas por mês',
        'Análise estatística intermediária',
        'Análise de sentimentos segmentada'
      ]
    },
    {
      name: 'Nexus Infinito',
      monthlyPrice: 1249,
      yearlyPrice: 11899, // 15% desconto
      description: 'Para grandes empresas',
      icon: 'N',
      gradient: 'bg-gradient-purple',
      features: [
        'Questões ilimitadas por pesquisa',
        'Respostas ilimitadas por pesquisa',
        '15 pesquisas por mês',
        'Análise estatística avançada',
        'Análise de sentimento multicanal',
        'Modelos preditivos avançados'
      ]
    }
  ];

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const calculateSavings = (monthlyPrice: number, yearlyPrice: number) => {
    const yearlyMonthly = monthlyPrice * 12;
    const savings = yearlyMonthly - yearlyPrice;
    const percentage = Math.round((savings / yearlyMonthly) * 100);
    return { savings, percentage };
  };

  return (
    <main className="min-h-screen bg-section-light">
      {/* Hero Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 via-transparent to-brand-green/5"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center fade-in">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-accent rounded-full text-white text-sm font-medium mb-8 shadow-[var(--shadow-glow)]">
            ✨ Powered by Advanced AI
          </div>
          <h1 className="text-hero text-brand-dark-blue mb-8 leading-tight">
            Transforme <span className="bg-gradient-accent bg-clip-text text-transparent">Feedback</span> em 
            <span className="bg-gradient-purple bg-clip-text text-transparent">Insights</span> Poderosos
          </h1>
          <p className="text-subtitle text-brand-gray mb-12 max-w-3xl mx-auto leading-relaxed">
            Nossa plataforma de análise de sentimento com IA ajuda você a entender melhor seus clientes 
            e tomar decisões baseadas em dados reais e insights acionáveis.
          </p>

        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-brand-dark-blue mb-4">
              Escolha o <span className="bg-gradient-accent bg-clip-text text-transparent">Plano Ideal</span>
            </h2>
            <p className="text-xl text-brand-gray max-w-2xl mx-auto mb-8">
              Planos flexíveis que crescem com seu negócio
            </p>
            
            {/* Switch Mensal/Anual */}
            <div className="flex items-center justify-center mb-8">
              <div className="bg-white rounded-xl p-2 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsYearly(false)}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                      !isYearly
                        ? 'bg-gradient-accent text-white shadow-md'
                        : 'text-brand-gray hover:text-brand-dark-blue'
                    }`}
                  >
                    Mensal
                  </button>
                  <button
                    onClick={() => setIsYearly(true)}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 relative ${
                      isYearly
                        ? 'bg-gradient-accent text-white shadow-md'
                        : 'text-brand-gray hover:text-brand-dark-blue'
                    }`}
                  >
                    Anual
                    <span className="absolute -top-2 -right-2 bg-brand-green text-white text-xs px-2 py-1 rounded-full">
                      15% OFF
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => {
              const currentPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
              const savings = isYearly ? calculateSavings(plan.monthlyPrice, plan.yearlyPrice) : null;
              
              return (
                <div key={plan.name} className={`card-modern p-8 group relative ${
                  plan.isPopular ? 'border-2 border-brand-green/30 bg-gradient-to-br from-white to-brand-green/5' : ''
                }`}>
                  {plan.isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gradient-accent text-white px-6 py-2 rounded-full text-sm font-semibold shadow-[var(--shadow-glow)]">
                        ⭐ Mais Popular
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-brand-dark-blue">{plan.name}</h3>
                    <div className={`w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center ${
                      plan.isPopular ? 'shadow-[var(--shadow-glow)]' : ''
                    }`}>
                      <span className="text-white font-bold">{plan.icon}</span>
                    </div>
                  </div>
                  
                  <div className="mb-8">
                    <div className="text-4xl font-bold text-brand-dark-blue mb-2">
                      R$ {formatCurrency(currentPrice)}<span className="text-lg text-brand-gray font-normal">
                        {isYearly ? '/ano' : '/mês'}
                      </span>
                    </div>
                    {isYearly && savings && (
                      <div className="text-sm text-brand-green font-semibold mb-2">
                        Economize R$ {formatCurrency(savings.savings)} ({savings.percentage}% desconto)
                      </div>
                    )}
                    <p className="text-brand-gray">{plan.description}</p>
                  </div>
                  
                  <ul className="space-y-4 mb-8 text-brand-gray">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full group-hover:shadow-[var(--shadow-elevated)] ${
                      plan.isPopular 
                        ? 'btn-gradient glow-effect'
                        : 'btn-hero'
                    }`}
                    onClick={() => navigate(`/create-account?plan=${plan.name.toLowerCase().replace(/\s+/g, '-')}`)}
                  >
                    Comece Agora
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}