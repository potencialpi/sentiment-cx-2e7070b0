import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, FileText, Settings, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getPlanDisplayName, getPlanCreateSurveyRoute } from '@/lib/planUtils';

interface CompanyData {
  plan_name: string;
  company_name: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      // Buscar dados da empresa do usuário
      const { data, error } = await supabase
        .from('companies')
        .select('plan_name, company_name')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados da conta",
          variant: "destructive",
        });
        return;
      }

      setCompanyData(data);
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg-gray flex items-center justify-center">
        <div className="text-brand-dark-gray">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg-gray">
      {/* Header do Admin */}
      <header className="bg-brand-dark-blue text-brand-white p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sentiment CX</h1>
            <p className="text-brand-white/80">Painel Administrativo</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleGoBack}
              className="bg-brand-dark-blue text-brand-white border border-brand-white/20 hover:bg-brand-white/10"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button 
              onClick={handleLogout}
              className="bg-brand-green text-brand-white hover:bg-brand-green/90"
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="p-6 max-w-7xl mx-auto">
        {/* Card Status da Conta */}
        <Card className="mb-8 bg-brand-white">
          <CardHeader>
            <CardTitle className="text-base font-medium text-brand-dark-blue" style={{ fontFamily: 'Roboto', fontSize: '16px' }}>
              Status da Conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-brand-dark-gray/70 mb-1">Plano Atual:</p>
                <p className="text-lg font-semibold text-brand-dark-gray">
                  {companyData ? getPlanDisplayName(companyData.plan_name) : 'Carregando...'}
                </p>
              </div>
              <div>
                <p className="text-sm text-brand-dark-gray/70 mb-1">Empresa:</p>
                <p className="text-lg font-semibold text-brand-dark-gray">
                  {companyData?.company_name || 'Carregando...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-brand-dark-gray mb-2">
            Bem-vindo ao Sentiment CX!
          </h2>
          <p className="text-brand-dark-gray/70">
            Gerencie suas pesquisas e analise os resultados em tempo real.
          </p>
        </div>

        {/* Grid de Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-pricing bg-brand-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-dark-gray">
                Pesquisas Ativas
              </CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-dark-gray">-</div>
              <p className="text-xs text-brand-dark-gray/60">
                Dados em tempo real
              </p>
            </CardContent>
          </Card>

          <Card className="card-pricing bg-brand-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-dark-gray">
                Total de Respostas
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-dark-gray">-</div>
              <p className="text-xs text-brand-dark-gray/60">
                Dados em tempo real
              </p>
            </CardContent>
          </Card>

          <Card className="card-pricing bg-brand-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-dark-gray">
                Taxa de Conversão
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-dark-gray">-</div>
              <p className="text-xs text-brand-dark-gray/60">
                Dados em tempo real
              </p>
            </CardContent>
          </Card>

          <Card className="card-pricing bg-brand-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-dark-gray">
                Sentiment Score
              </CardTitle>
              <Settings className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-dark-gray">-</div>
              <p className="text-xs text-brand-dark-gray/60">
                Dados em tempo real
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ações Principais */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-brand-white">
            <CardHeader>
              <CardTitle className="text-brand-dark-gray">Criar Nova Pesquisa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-brand-dark-gray/70 mb-4">
                Comece criando um novo questionário para coletar insights valiosos.
              </p>
              <Button 
                className="bg-brand-green text-brand-white hover:bg-brand-green/90"
                onClick={() => {
                  const planCode = companyData?.plan_name || 'start-quantico';
                  navigate(getPlanCreateSurveyRoute(planCode));
                }}
              >
                Criar Pesquisa
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-brand-white">
            <CardHeader>
              <CardTitle className="text-brand-dark-gray">Relatórios e Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-brand-dark-gray/70 mb-4">
                Visualize dados e gere relatórios detalhados das suas pesquisas.
              </p>
              <Button 
                variant="outline"
                className="border-brand-dark-gray text-brand-dark-gray hover:bg-brand-dark-gray hover:text-brand-white"
              >
                Ver Relatórios
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Admin;