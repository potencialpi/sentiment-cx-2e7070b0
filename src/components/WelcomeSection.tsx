import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function WelcomeSection() {
  const navigate = useNavigate();

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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="btn-gradient px-8 py-4 text-lg glow-effect"
              onClick={() => navigate('/choose-plan')}
            >
              Escolher Plano
            </Button>
            <Button 
              variant="outline"
              className="px-8 py-4 text-lg border-2 border-brand-dark-blue/20 hover:border-brand-green hover:bg-brand-green/5 transition-all duration-300"
              onClick={() => navigate('/login')}
            >
              Fazer Login
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-brand-dark-blue mb-4">
              Escolha o <span className="bg-gradient-accent bg-clip-text text-transparent">Plano Ideal</span>
            </h2>
            <p className="text-xl text-brand-gray max-w-2xl mx-auto">
              Planos flexíveis que crescem com seu negócio
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Start Quântico */}
            <div className="card-modern p-8 group">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-brand-dark-blue">Start Quântico</h3>
                <div className="w-12 h-12 bg-gradient-to-br from-brand-light-blue to-brand-cyan rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">S</span>
                </div>
              </div>
              <div className="mb-8">
                <div className="text-4xl font-bold text-brand-dark-blue mb-2">
                  R$ 349<span className="text-lg text-brand-gray font-normal">/mês</span>
                </div>
                <p className="text-brand-gray">Perfeito para começar</p>
              </div>
              <ul className="space-y-4 mb-8 text-brand-gray">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  Até 5 questões por pesquisa
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  100 respostas por pesquisa
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  2 pesquisas por mês
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  Análise estatística básica
                </li>
              </ul>
              <Button 
                className="w-full btn-hero group-hover:shadow-[var(--shadow-elevated)]"
                onClick={() => navigate('/choose-plan')}
              >
                Comece Agora
              </Button>
            </div>

            {/* Vortex Neural */}
            <div className="card-modern p-8 group relative border-2 border-brand-green/30 bg-gradient-to-br from-white to-brand-green/5">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-accent text-white px-6 py-2 rounded-full text-sm font-semibold shadow-[var(--shadow-glow)]">
                  ⭐ Mais Popular
                </div>
              </div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-brand-dark-blue">Vortex Neural</h3>
                <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center shadow-[var(--shadow-glow)]">
                  <span className="text-white font-bold">V</span>
                </div>
              </div>
              <div className="mb-8">
                <div className="text-4xl font-bold text-brand-dark-blue mb-2">
                  R$ 649<span className="text-lg text-brand-gray font-normal">/mês</span>
                </div>
                <p className="text-brand-gray">Para empresas em crescimento</p>
              </div>
              <ul className="space-y-4 mb-8 text-brand-gray">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  Até 10 questões por pesquisa
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  250 respostas por pesquisa
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  4 pesquisas por mês
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  Análise estatística intermediária
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  Análise de sentimentos segmentada
                </li>
              </ul>
              <Button 
                className="w-full btn-gradient group-hover:shadow-[var(--shadow-elevated)] glow-effect"
                onClick={() => navigate('/choose-plan')}
              >
                Comece Agora
              </Button>
            </div>

            {/* Nexus Infinito */}
            <div className="card-modern p-8 group">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-brand-dark-blue">Nexus Infinito</h3>
                <div className="w-12 h-12 bg-gradient-purple rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">N</span>
                </div>
              </div>
              <div className="mb-8">
                <div className="text-4xl font-bold text-brand-dark-blue mb-2">
                  R$ 1.249<span className="text-lg text-brand-gray font-normal">/mês</span>
                </div>
                <p className="text-brand-gray">Para grandes empresas</p>
              </div>
              <ul className="space-y-4 mb-8 text-brand-gray">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  Questões ilimitadas por pesquisa
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  Respostas ilimitadas por pesquisa
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  15 pesquisas por mês
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  Análise estatística avançada
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  Análise de sentimento multicanal
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-brand-green rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  Modelos preditivos avançados
                </li>
              </ul>
              <Button 
                className="w-full btn-hero group-hover:shadow-[var(--shadow-elevated)]"
                onClick={() => navigate('/choose-plan')}
              >
                Comece Agora
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}