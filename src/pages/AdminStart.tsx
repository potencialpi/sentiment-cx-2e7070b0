import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  Users, 
  FileText, 
  Settings, 
  Plus, 
  ExternalLink,
  PieChart,
  Download,
  Activity
} from 'lucide-react';

interface Survey {
  id: string;
  title: string;
  current_responses: number;
  max_responses: number;
  status: string;
  unique_link: string | null;
  created_at: string;
}

interface Profile {
  plan_name: string;
  status: string;
}

const AdminStart = () => {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setUser(user);
      await fetchData(user.id);
    };

    getUser();
  }, [navigate]);

  const fetchData = async (userId: string) => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('plan_name, status')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile error:', profileError);
      } else {
        setProfile(profileData);
      }

      // Fetch surveys
      const { data: surveysData, error: surveysError } = await supabase
        .from('surveys')
        .select('id, title, current_responses, max_responses, status, unique_link, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (surveysError) {
        console.error('Surveys error:', surveysError);
        toast({
          title: "Erro",
          description: "Falha ao carregar pesquisas",
          variant: "destructive"
        });
      } else {
        setSurveys(surveysData || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSurvey = () => {
    navigate('/create-survey');
  };

  const handleGenerateLink = async (surveyId: string) => {
    try {
      // Usar a função do Supabase para gerar link único
      const { data, error } = await supabase.rpc('generate_survey_link', {
        _survey_id: surveyId
      });

      if (error) throw error;

      const fullLink = `${window.location.origin}/survey/${data}`;
      
      await navigator.clipboard.writeText(fullLink);
      
      toast({
        title: "Link Criado!",
        description: "Link copiado para a área de transferência",
      });

      // Refresh surveys
      if (user) {
        await fetchData(user.id);
      }
    } catch (error) {
      console.error('Error generating link:', error);
      toast({
        title: "Erro",
        description: "Falha ao gerar link",
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getUsageProgress = () => {
    const maxSurveys = 2; // Start Quântico limit
    const currentSurveys = surveys.length;
    return (currentSurveys / maxSurveys) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-brand-dark-blue text-brand-white p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-nav font-semibold mb-2">Sentiment CX</h1>
            <h2 className="text-hero-title font-bold">Dashboard do Administrador - Start Quântico</h2>
            <p className="text-nav text-brand-white/80 mt-2">
              Gerencie suas pesquisas e respondentes
            </p>
          </div>
          <Button onClick={handleLogout} variant="outlineLight">
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {/* Account Status */}
        <div className="mb-8">
          <Card className="card-pricing">
            <CardHeader>
              <CardTitle className="text-brand-dark-gray flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Status da Conta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-brand-dark-gray">Plano: <strong>Start Quântico</strong></p>
                  <Badge variant={profile?.status === 'active' ? 'default' : 'destructive'}>
                    {profile?.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-brand-dark-gray/70">Uso de Pesquisas</p>
                  <div className="w-32 mt-2">
                    <Progress value={getUsageProgress()} className="h-2" />
                    <p className="text-xs text-brand-dark-gray/60 mt-1">
                      {surveys.length}/2 pesquisas
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-pricing">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-dark-gray">
                Pesquisas Ativas
              </CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-dark-gray">
                {surveys.filter(s => s.status === 'active').length}
              </div>
              <p className="text-xs text-brand-dark-gray/60">
                Máximo: 2 pesquisas
              </p>
            </CardContent>
          </Card>

          <Card className="card-pricing">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-dark-gray">
                Total de Respostas
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-dark-gray">
                {surveys.reduce((acc, survey) => acc + survey.current_responses, 0)}
              </div>
              <p className="text-xs text-brand-dark-gray/60">
                Máximo: 100 por pesquisa
              </p>
            </CardContent>
          </Card>

          <Card className="card-pricing">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-dark-gray">
                Questões Disponíveis
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-dark-gray">5</div>
              <p className="text-xs text-brand-dark-gray/60">
                Por pesquisa
              </p>
            </CardContent>
          </Card>

          <Card className="card-pricing">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-dark-gray">
                Links Gerados
              </CardTitle>
              <Settings className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-dark-gray">
                {surveys.filter(s => s.unique_link).length}
              </div>
              <p className="text-xs text-brand-dark-gray/60">
                Pesquisas com link ativo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-brand-dark-gray">Criar Nova Pesquisa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-brand-dark-gray/70 mb-4">
                Comece criando um novo questionário para coletar insights valiosos.
                Máximo de 5 questões por pesquisa.
              </p>
              <Button 
                variant="hero" 
                onClick={handleCreateSurvey}
                className="w-full"
                disabled={surveys.length >= 2}
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Nova Pesquisa
              </Button>
              {surveys.length >= 2 && (
                <p className="text-xs text-destructive mt-2">
                  Limite de pesquisas atingido (2/2)
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-brand-dark-gray">Gerenciar Respondentes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-brand-dark-gray/70 mb-4">
                Cadastre e gerencie pessoas que podem participar das suas pesquisas.
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin/start/respondentes')}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                Cadastrar Respondentes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-brand-dark-gray">Ver Estatísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-brand-dark-gray/70 mb-4">
                Visualize dados e gere relatórios detalhados das suas pesquisas com análise de sentimento.
              </p>
              <Button variant="outline" className="w-full">
                <PieChart className="h-4 w-4 mr-2" />
                Ver Estatísticas
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Surveys List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-brand-dark-gray">Suas Pesquisas</CardTitle>
          </CardHeader>
          <CardContent>
            {surveys.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-brand-dark-gray/70">
                  Nenhuma pesquisa criada ainda. Comece criando sua primeira pesquisa!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {surveys.map((survey) => (
                  <div 
                    key={survey.id} 
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-brand-dark-gray">
                          {survey.title}
                        </h3>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>
                            {survey.status === 'active' ? 'Ativa' : 'Inativa'}
                          </Badge>
                          <span className="text-sm text-brand-dark-gray/70">
                            Respondentes: {survey.current_responses}/{survey.max_responses}
                          </span>
                          <div className="w-24">
                            <Progress 
                              value={(survey.current_responses / survey.max_responses) * 100} 
                              className="h-2" 
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {survey.unique_link ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const fullLink = `${window.location.origin}/survey/${survey.unique_link}`;
                              navigator.clipboard.writeText(fullLink);
                              toast({
                                title: "Link Copiado!",
                                description: "Link da pesquisa copiado para a área de transferência",
                              });
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Copiar Link
                          </Button>
                        ) : (
                          <Button
                            variant="hero"
                            size="sm"
                            onClick={() => handleGenerateLink(survey.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Gerar Link
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Exportar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminStart;