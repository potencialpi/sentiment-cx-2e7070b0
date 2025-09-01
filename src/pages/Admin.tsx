import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, FileText, Settings, ArrowLeft, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getPlanDisplayName, getPlanCreateSurveyRoute, getPlanRespondentsRoute, getUserPlan } from '@/lib/planUtils';

interface UserData {
  plan_name: string;
  user_id: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuthAndFetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      // Usar a função getUserPlan que busca nas tabelas corretas (companies e profiles)
      const planCode = await getUserPlan(supabase, session.user.id);
      
      console.log('Admin - Plano encontrado:', planCode);
      setUserData({ plan_name: planCode, user_id: session.user.id });
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    checkAuthAndFetchData();
  }, [checkAuthAndFetchData]);

  const handleLogout = async () => {
    const { robustLogout } = await import('@/lib/authUtils');
    await robustLogout(navigate);
  };

  const handleGoBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg-gray flex items-center justify-center">
        <div className="text-brand-dark-gray">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-section-light">
      {/* Header */}
      <header className="bg-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
        <div className="relative z-10 py-8 px-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center shadow-[var(--shadow-glow)]">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Sentiment <span className="text-brand-green">CX</span>
                </h1>
                <p className="text-white/80 text-lg">Painel Administrativo</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleGoBack}
                className="btn-outline-light glow-effect"
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handleLogout}
                className="btn-gradient glow-effect"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="p-6 max-w-7xl mx-auto">
        {/* Card Status da Conta */}
        <div className="card-modern mb-8 fade-in">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-xl font-semibold text-brand-dark-blue">
                Status da Conta
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-gradient-to-br from-brand-green/10 to-brand-cyan/10 rounded-xl border border-brand-green/20">
                <p className="text-sm text-brand-dark-gray/70 mb-2">Plano Atual:</p>
                <p className="text-xl font-bold text-brand-dark-blue">
                  {userData ? getPlanDisplayName(userData.plan_name) : 'Carregando...'}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-brand-purple/10 to-brand-light-blue/10 rounded-xl border border-brand-purple/20">
                <p className="text-sm text-brand-dark-gray/70 mb-2">Status:</p>
                <p className="text-xl font-bold text-brand-dark-blue">
                  {userData?.user_id ? '🟢 Conectado' : '⏳ Carregando...'}
                </p>
              </div>
            </div>
          </CardContent>
        </div>

        <div className="mb-12 text-center fade-in">
          <h2 className="text-4xl font-bold text-brand-dark-blue mb-4">
            Bem-vindo ao <span className="bg-gradient-accent bg-clip-text text-transparent">Sentiment CX</span>!
          </h2>
          <p className="text-xl text-brand-gray max-w-2xl mx-auto leading-relaxed">
            Gerencie suas pesquisas e analise os resultados em tempo real com nossa plataforma de IA.
          </p>
        </div>

        {/* Grid de Cards de Métricas */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="card-modern p-6 group interactive-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-green to-brand-cyan rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-brand-dark-blue pulse-modern">-</div>
              </div>
            </div>
            <h3 className="text-sm font-semibold text-brand-dark-gray mb-1">
              Pesquisas Ativas
            </h3>
            <p className="text-xs text-brand-gray">
              📊 Dados em tempo real
            </p>
          </div>

          <div className="card-modern p-6 group interactive-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-purple to-brand-light-blue rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-brand-dark-blue pulse-modern">-</div>
              </div>
            </div>
            <h3 className="text-sm font-semibold text-brand-dark-gray mb-1">
              Total de Respostas
            </h3>
            <p className="text-xs text-brand-gray">
              👥 Dados em tempo real
            </p>
          </div>

          <div className="card-modern p-6 group interactive-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-orange to-brand-green rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-brand-dark-blue pulse-modern">-</div>
              </div>
            </div>
            <h3 className="text-sm font-semibold text-brand-dark-gray mb-1">
              Taxa de Conversão
            </h3>
            <p className="text-xs text-brand-gray">
              📈 Dados em tempo real
            </p>
          </div>

          <div className="card-modern p-6 group interactive-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-brand-dark-blue pulse-modern">-</div>
              </div>
            </div>
            <h3 className="text-sm font-semibold text-brand-dark-gray mb-1">
              Sentiment Score
            </h3>
            <p className="text-xs text-brand-gray">
              🎯 Dados em tempo real
            </p>
          </div>
        </div>

        {/* Ações Principais */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="card-modern p-8 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-accent opacity-10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center shadow-[var(--shadow-glow)] group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-brand-dark-blue mb-1">Criar Nova Pesquisa</h3>
                  <p className="text-brand-gray">🚀 Comece agora</p>
                </div>
              </div>
              <p className="text-brand-gray mb-6 leading-relaxed">
                Comece criando um novo questionário para coletar insights valiosos e analisar o sentimento dos seus clientes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button 
                  className="btn-gradient flex-1 glow-effect group-hover:shadow-[var(--shadow-elevated)]"
                  onClick={() => {
                    const planCode = userData?.plan_name || 'start-quantico';
                    navigate(getPlanCreateSurveyRoute(planCode));
                  }}
                >
                  ✨ Criar Pesquisa
                </Button>
                <Button 
                  variant="outline"
                  className="border-brand-green text-brand-green hover:bg-brand-green hover:text-brand-white flex-1 transition-all duration-300"
                  onClick={() => {
                    const planCode = userData?.plan_name || 'start-quantico';
                    navigate(getPlanRespondentsRoute(planCode));
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Respondentes
                </Button>
              </div>
            </div>
          </div>

          <div className="card-modern p-8 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-purple opacity-10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-purple rounded-2xl flex items-center justify-center shadow-[var(--shadow-card)] group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-brand-dark-blue mb-1">Relatórios e Analytics</h3>
                  <p className="text-brand-gray">📊 Insights poderosos</p>
                </div>
              </div>
              <p className="text-brand-gray mb-6 leading-relaxed">
                Visualize dados e gere relatórios detalhados das suas pesquisas com análise de sentimento em tempo real.
              </p>
              <Button 
                className="btn-hero w-full group-hover:shadow-[var(--shadow-elevated)]"
                onClick={() => navigate('/reports')}
              >
                📈 Ver Relatórios
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;