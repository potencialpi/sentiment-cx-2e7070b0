import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const plans = [
  {
    id: 'start-quantico',
    name: 'Start Quântico',
    monthlyPrice: 'R$ 349/mês',
    yearlyPrice: 'R$ 3.499 à vista',
    features: [
      'Até 5 questões por pesquisa',
      '50 respostas por pesquisa',
      '3 pesquisas por mês',
      'Análise estatística básica',
      'Análise de sentimento simples'
    ]
  },
  {
    id: 'vortex-neural',
    name: 'Vortex Neural',
    monthlyPrice: 'R$ 649/mês',
    yearlyPrice: 'R$ 6.199 à vista',
    features: [
      'Até 10 questões por pesquisa',
      '250 respostas por pesquisa',
      '4 pesquisas por mês',
      'Análise estatística intermediária',
      'Análise de sentimentos segmentada'
    ]
  },
  {
    id: 'nexus-infinito',
    name: 'Nexus Infinito',
    monthlyPrice: 'R$ 1.249/mês',
    yearlyPrice: 'R$ 11.899 à vista',
    features: [
      'Questões ilimitadas por pesquisa',
      'Respostas ilimitadas por pesquisa',
      'Pesquisas ilimitadas por mês',
      'Análise estatística avançada',
      'Análise de sentimento multicanal',
      'Modelos preditivos avançados'
    ]
  }
];

const ChoosePlan = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingTypes, setBillingTypes] = useState<{ [key: string]: string }>({
    'start-quantico': 'monthly',
    'vortex-neural': 'monthly',
    'nexus-infinito': 'monthly'
  });

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleBillingChange = (planId: string, billing: string) => {
    setBillingTypes(prev => ({
      ...prev,
      [planId]: billing
    }));
  };

  const handleContinue = () => {
    if (!selectedPlan) return;
    
    const plan = plans.find(p => p.id === selectedPlan);
    const billingType = billingTypes[selectedPlan];
    
    navigate('/create-account', {
      state: {
        selectedPlan: plan,
        billingType
      }
    });
  };

  return (
    <div className="min-h-screen bg-brand-bg-gray">
      <Header />
      <div className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-brand-dark-blue mb-4">
              Escolha o Plano Ideal
            </h1>
            <p className="text-lg text-brand-dark-blue/80">
              Selecione o plano que melhor atende às necessidades da sua empresa
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`bg-brand-white border-2 transition-all duration-300 hover:shadow-lg ${
                  selectedPlan === plan.id ? 'border-brand-green' : 'border-gray-200'
                }`}
              >
                <CardHeader className="text-center">
                  <CardTitle className="text-xl font-bold text-brand-dark-blue">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-2xl font-bold text-brand-green mt-2">
                    {billingTypes[plan.id] === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="mb-4">
                    <Select 
                      value={billingTypes[plan.id]} 
                      onValueChange={(value) => handleBillingChange(plan.id, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="yearly">À vista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="text-sm text-brand-dark-blue/80 flex items-center">
                        <span className="text-brand-green mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full font-semibold ${
                      selectedPlan === plan.id 
                        ? 'bg-brand-green text-white hover:bg-brand-green/90' 
                        : 'bg-brand-green text-white hover:bg-brand-green/90'
                    }`}
                  >
                    Selecionar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            <Button
              onClick={() => navigate('/')}
              className="bg-brand-dark-blue text-white hover:bg-brand-dark-blue/90 px-8"
            >
              Voltar
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!selectedPlan}
              className="bg-brand-green text-white hover:bg-brand-green/90 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChoosePlan;