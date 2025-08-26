import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, BarChart3, FileText, TrendingUp, Users, LogOut } from 'lucide-react';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import AnalyticsDashboardFallback from '@/components/AnalyticsDashboardFallback';
import { getPlanCreateSurveyRoute, getUserPlan } from '@/lib/planUtils';

interface Survey {
  id: string;
  title: string;
  description?: string;
  current_responses: number;
  max_responses: number;
  status: string;
  created_at: string;
}

const Reports = () => {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [hasRLSError, setHasRLSError] = useState(false);

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: surveys, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('user_id', user.id)
        .gt('current_responses', 0) // Apenas pesquisas com respostas
        .order('created_at', { ascending: false });

      if (error) {
        // Verificar se é erro de RLS (Row Level Security)
        if (error.message.includes('row-level security policy') || 
            error.message.includes('permission denied') ||
            error.message.includes('insufficient_privilege')) {
          setHasRLSError(true);
          console.warn('RLS policy error detected, switching to fallback mode');
          return;
        }
        throw error;
      }

      setSurveys(surveys || []);
      setHasRLSError(false);
      
      // Selecionar automaticamente a primeira pesquisa se houver
      if (surveys && surveys.length > 0 && !selectedSurveyId) {
        setSelectedSurveyId(surveys[0].id);
      }
    } catch (error) {
      console.error('Error fetching surveys:', error);
      
      // Verificar se é erro de RLS
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('row-level security policy') || 
          errorMessage.includes('permission denied') ||
          errorMessage.includes('insufficient_privilege')) {
        setHasRLSError(true);
        return;
      }
      
      toast({
        title: "Erro",
        description: "Falha ao carregar pesquisas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [selectedSurveyId]);

  const checkAuth = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/');
      return;
    }
    setUser(user);
  }, [navigate]);

  useEffect(() => {
    const initializeData = async () => {
      await checkAuth();
      await fetchSurveys();
    };
    initializeData();
  }, [checkAuth, fetchSurveys]);

  const handleLogout = async () => {
    const { robustLogout } = await import('@/lib/authUtils');
    await robustLogout(navigate);
  };

  const selectedSurvey = surveys.find(s => s.id === selectedSurveyId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F]">
      {/* Header */}
      <header className="bg-[#0A192F]/95 backdrop-blur-sm border-b border-[#00FF00]/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/admin')}
                className="text-[#00FF00] hover:bg-[#00FF00]/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6 text-[#00FF00]" />
                <h1 className="text-xl font-bold text-white">Relatórios e Analytics</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">
                {user?.email}
              </span>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-gray-300 hover:text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-[#00FF00] animate-pulse" />
              <p className="text-white">Carregando relatórios...</p>
            </div>
          </div>
        ) : hasRLSError ? (
          <div className="space-y-6">
            <AnalyticsDashboardFallback surveyId="demo" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-6 text-gray-400" />
            <h2 className="text-2xl font-bold text-white mb-4">Nenhuma pesquisa com respostas</h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Você precisa ter pesquisas com pelo menos uma resposta para visualizar relatórios e analytics.
            </p>
            <div className="space-y-4">
              <Button
                onClick={() => navigate('/admin')}
                className="bg-[#00FF00] hover:bg-[#00FF00]/90 text-[#0A192F] font-semibold"
              >
                Ir para Dashboard
              </Button>
              <div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (user) {
                      const planCode = await getUserPlan(user.id);
                      const route = getPlanCreateSurveyRoute(planCode);
                      navigate(route);
                    }
                  }}
                  className="border-[#00FF00] text-[#00FF00] hover:bg-[#00FF00] hover:text-[#0A192F]"
                >
                  Criar Nova Pesquisa
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Seletor de Pesquisa */}
            <Card className="bg-white/10 backdrop-blur-sm border-[#00FF00]/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-[#00FF00]" />
                    Selecionar Pesquisa para Análise
                  </CardTitle>
                  <div className="flex items-center space-x-2 text-sm text-gray-300">
                    <Users className="h-4 w-4" />
                    <span>{surveys.length} pesquisa(s) com respostas</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Escolha uma pesquisa:
                    </label>
                    <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
                      <SelectTrigger className="bg-white/10 border-[#00FF00]/30 text-white">
                        <SelectValue placeholder="Selecione uma pesquisa" />
                      </SelectTrigger>
                      <SelectContent>
                        {surveys.map(survey => (
                          <SelectItem key={survey.id} value={survey.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{survey.title}</span>
                              <span className="text-xs text-gray-500">
                                {survey.current_responses}/{survey.max_responses} respostas • 
                                {new Date(survey.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedSurvey && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <h3 className="font-semibold text-white mb-2">{selectedSurvey.title}</h3>
                      {selectedSurvey.description && (
                        <p className="text-sm text-gray-300 mb-2">{selectedSurvey.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Status: {selectedSurvey.status === 'active' ? 'Ativa' : 'Inativa'}</span>
                        <span>{selectedSurvey.current_responses} respostas</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dashboard de Analytics */}
            {selectedSurveyId && (
              <div className="bg-white rounded-lg shadow-lg">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <BarChart3 className="h-6 w-6 mr-2 text-[#00FF00]" />
                    Analytics - {selectedSurvey?.title}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Análise detalhada dos dados coletados com gráficos interativos e estatísticas.
                  </p>
                </div>
                <div className="p-6">
                  {hasRLSError ? (
                    <AnalyticsDashboardFallback surveyId={selectedSurveyId} />
                  ) : (
                    <AnalyticsDashboard surveyId={selectedSurveyId} />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Reports;