import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Eye, Trash2, LogOut, ArrowLeft, Plus } from 'lucide-react';
import { getPlanAdminRoute, getPlanCreateSurveyRoute, getUserPlan } from '@/lib/planUtils';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  question_order: number;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  current_responses: number;
  max_responses: number;
  unique_link: string | null;
  questions: Question[];
}

const CreateSurvey = () => {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [userPlan, setUserPlan] = useState<string>('');

  useEffect(() => {
    const initializePage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        // Buscar plano do usuário usando utilitário que consulta companies/profiles
        try {
          const planCode = await getUserPlan(supabase, user.id);
          setUserPlan(planCode);
        } catch (e) {
          console.warn('Não foi possível obter plano do usuário, usando fallback start-quantico.', e);
          setUserPlan('start-quantico');
        }

        await fetchSurveys();
      } catch (error) {
        console.error('Error initializing page:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar página",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [navigate]);

  const fetchSurveys = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: surveysData, error } = await supabase
        .from('surveys')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          current_responses,
          max_responses,
          unique_link,
          questions (
            id,
            question_text,
            question_type,
            options,
            question_order
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform the data to match our interface
      const transformedSurveys = (surveysData || []).map(survey => ({
        ...survey,
        questions: (survey.questions || []).map(question => ({
          ...question,
          options: Array.isArray(question.options) ? question.options.filter((opt): opt is string => typeof opt === 'string') : null
        }))
      }));
      
      setSurveys(transformedSurveys);
    } catch (error) {
      console.error('Error fetching surveys:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar pesquisas",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    try {
      const { error } = await supabase
        .from('surveys')
        .delete()
        .eq('id', surveyId);

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Pesquisa excluída com sucesso",
      });

      await fetchSurveys();
    } catch (error) {
      console.error('Error deleting survey:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir pesquisa",
        variant: "destructive"
      });
    }
  };

  const handleCreateSurvey = () => {
    const createSurveyRoute = getPlanCreateSurveyRoute(userPlan);
    navigate(createSurveyRoute);
  };

  const handleLogout = async () => {
    const { robustLogout } = await import('@/lib/authUtils');
    await robustLogout(navigate);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#D1D5DB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando pesquisas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg-gray">
      {/* Header */}
      <div className="bg-brand-white shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-brand-dark-gray hover:text-brand-dark-blue"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <h1 className="text-xl font-semibold text-brand-dark-gray">Minhas Pesquisas</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCreateSurvey}
                className="bg-brand-dark-blue hover:bg-brand-dark-blue/90 text-brand-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Pesquisa
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="text-brand-dark-gray hover:text-brand-dark-blue border-border"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {surveys.length === 0 ? (
          <Card className="bg-brand-white shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">Nenhuma pesquisa encontrada</p>
              <Button
                onClick={handleCreateSurvey}
                className="bg-brand-green text-brand-white hover:bg-brand-green/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira pesquisa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {surveys.map((survey) => (
              <Card key={survey.id} className="bg-brand-white shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-brand-dark-gray">{survey.title}</h3>
                        <Badge 
                          variant={survey.status === 'active' ? 'default' : 'secondary'}
                          className={survey.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                        >
                          {survey.status === 'active' ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      {survey.description && (
                        <p className="text-muted-foreground mb-2">{survey.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Criada em: {formatDate(survey.created_at)}</span>
                        <span>Respostas: {survey.current_responses}/{survey.max_responses}</span>
                        <span>Perguntas: {survey.questions?.length || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {/* Botão Visualizar */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="bg-brand-green text-brand-white hover:bg-brand-green/90"
                            onClick={() => setSelectedSurvey(survey)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Visualizar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{selectedSurvey?.title}</DialogTitle>
                            <DialogDescription>
                              Detalhes da pesquisa e suas perguntas
                            </DialogDescription>
                          </DialogHeader>
                          {selectedSurvey && (
                            <div className="space-y-6">
                              {/* Info da pesquisa */}
                              <div className="space-y-2">
                                <h4 className="font-medium text-brand-dark-gray">Informações Gerais</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Status:</span> 
                                    <Badge 
                                      variant={selectedSurvey.status === 'active' ? 'default' : 'secondary'}
                                      className={`ml-2 ${selectedSurvey.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                                    >
                                      {selectedSurvey.status === 'active' ? 'Ativa' : 'Inativa'}
                                    </Badge>
                                  </div>
                                  <div>
                                    <span className="font-medium">Respostas:</span> {selectedSurvey.current_responses}/{selectedSurvey.max_responses}
                                  </div>
                                  <div>
                                    <span className="font-medium">Criada em:</span> {formatDate(selectedSurvey.created_at)}
                                  </div>
                                  <div>
                                    <span className="font-medium">Link único:</span> {selectedSurvey.unique_link ? 'Sim' : 'Não'}
                                  </div>
                                </div>
                                {selectedSurvey.description && (
                                  <div>
                                    <span className="font-medium">Descrição:</span>
                                    <p className="text-muted-foreground mt-1">{selectedSurvey.description}</p>
                                  </div>
                                )}
                              </div>

                              {/* Perguntas */}
                              <div className="space-y-4">
                                <h4 className="font-medium text-brand-dark-gray">Perguntas ({selectedSurvey.questions?.length || 0})</h4>
                                {selectedSurvey.questions && selectedSurvey.questions.length > 0 ? (
                                  <div className="space-y-4">
                                    {selectedSurvey.questions
                                      .sort((a, b) => a.question_order - b.question_order)
                                      .map((question, index) => (
                                      <div key={question.id} className="border border-border rounded-lg p-4 bg-brand-white">
                                        <div className="flex items-start gap-3">
                                          <span className="bg-muted text-muted-foreground text-sm px-2 py-1 rounded">
                                            {index + 1}
                                          </span>
                                          <div className="flex-1">
                                            <p className="font-medium text-brand-dark-gray mb-2">{question.question_text}</p>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                                              <span>Tipo: {question.question_type === 'single_choice' ? 'Escolha única' : 
                                                           question.question_type === 'multiple_choice' ? 'Múltipla escolha' :
                                                           question.question_type === 'text' ? 'Texto livre' :
                                                           question.question_type === 'rating' ? 'Avaliação por estrelas' : 
                                                           question.question_type}</span>
                                            </div>
                                            {question.options && question.options.length > 0 && (
                                              <div>
                                                <span className="text-sm font-medium text-brand-dark-gray">Opções:</span>
                                                <ul className="list-disc list-inside mt-1 text-sm text-muted-foreground">
                                                  {question.options.map((option, optionIndex) => (
                                                    <li key={optionIndex}>{option}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground">Nenhuma pergunta encontrada</p>
                                )}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      {/* Botão Excluir */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a pesquisa "{survey.title}"? 
                              Esta ação não pode ser desfeita e todos os dados relacionados 
                              (perguntas e respostas) serão permanentemente removidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSurvey(survey.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateSurvey;