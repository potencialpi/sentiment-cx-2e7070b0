import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Trash2, Mail, User, Send, Link as LinkIcon, UserPlus, Users, AlertTriangle } from 'lucide-react';
import { MagicLinkRequest } from '@/components/MagicLinkRequest';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { useRespondentDeletion } from '@/hooks/useRespondentDeletion';
import { getUserPlan, getPlanDisplayName } from '@/lib/planUtils';

interface Respondent {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  status: string;
}

const getPlanInfo = (planCode: string) => {
  const displayName = getPlanDisplayName(planCode);
  
  switch (planCode) {
    case 'start-quantico':
      return { name: displayName, limits: '5 questões, 100 respostas, 2 pesquisas/mês' };
    case 'vortex-neural':
      return { name: displayName, limits: '10 questões, 250 respostas, 4 pesquisas/mês' };
    case 'nexus-infinito':
      return { name: displayName, limits: 'Questões e respostas ilimitadas, pesquisas ilimitadas' };
    default:
      return { name: 'Start Quântico', limits: '5 questões, 100 respostas, 2 pesquisas/mês' };
  }
};

const AdminRespondents = () => {
  const { plan = 'start' } = useParams<{ plan: string }>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [showMagicLinkForm, setShowMagicLinkForm] = useState(false);
  
  // Estados para exclusão em massa
  const [selectedRespondents, setSelectedRespondents] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [respondentsToDelete, setRespondentsToDelete] = useState<string[]>([]);
  
  // Hook para exclusão
  const { isDeleting, deleteProgress, deleteSingleRespondent, deleteMultipleRespondents } = useRespondentDeletion();
  const [userPlan, setUserPlan] = useState<string>('start-quantico');
  const [planLoading, setPlanLoading] = useState(true);
  const { toast } = useToast();

  const planInfo = getPlanInfo(userPlan);

  const loadRespondents = useCallback(async () => {
    try {
      // Como a tabela 'respondents' não existe no esquema atual,
      // vamos simular uma lista vazia por enquanto
      console.log('Tabela respondents não disponível no esquema atual');
      setRespondents([]);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns momentos.",
        variant: "destructive",
      });
    } finally {
      setLoadingList(false);
    }
  }, [toast]);

  const loadSurveys = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: surveys, error } = await supabase
        .from('surveys')
        .select('id, title, description, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar pesquisas:', error);
        return;
      }

      setSurveys(surveys || []);
    } catch (error) {
      console.error('Erro inesperado ao carregar pesquisas:', error);
    }
  }, []);

  // Carregar plano real do usuário
  const loadUserPlan = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const actualPlan = await getUserPlan(supabase, user.id);
        console.log('AdminRespondents - Plano real do usuário:', actualPlan);
        setUserPlan(actualPlan);
      }
    } catch (error) {
      console.error('Erro ao carregar plano do usuário:', error);
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserPlan();
    loadRespondents();
    loadSurveys();
  }, [loadUserPlan, loadRespondents, loadSurveys]);

  const handleMagicLinkSuccess = (data: any) => {
    toast({
      title: "Magic Link Gerado!",
      description: "O link de acesso foi gerado com sucesso. Você pode copiá-lo e enviá-lo para o respondente.",
      variant: "default",
    });
    // Mantém o formulário aberto para permitir copiar o link
    // setShowMagicLinkForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast({
        title: "Erro no cadastro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para cadastrar respondentes.",
          variant: "destructive",
        });
        return;
      }

      // Como a tabela 'respondents' não existe no esquema atual,
      // vamos simular o cadastro por enquanto
      console.log('Simulando cadastro de respondente - Nome fornecido:', !!name.trim(), 'Email fornecido:', !!email.trim());
      
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "O cadastro de respondentes será implementado em breve.",
        variant: "destructive",
      });
      
      return;

      // Limpar formulário
      setName('');
      setEmail('');
      
      // Recarregar lista
      loadRespondents();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns momentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Funções para gerenciamento de seleção
  const handleSelectRespondent = (respondentId: string, checked: boolean) => {
    if (checked) {
      setSelectedRespondents(prev => [...prev, respondentId]);
    } else {
      setSelectedRespondents(prev => prev.filter(id => id !== respondentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRespondents(respondents.map(r => r.id));
    } else {
      setSelectedRespondents([]);
    }
  };

  // Função para exclusão individual
  const handleDelete = async (id: string, respondentName: string) => {
    setRespondentsToDelete([id]);
    setShowDeleteModal(true);
  };

  // Função para exclusão em massa
  const handleDeleteSelected = () => {
    if (selectedRespondents.length === 0) {
      toast({
        title: "Nenhum respondente selecionado",
        description: "Selecione pelo menos um respondente para excluir.",
        variant: "destructive",
      });
      return;
    }
    
    setRespondentsToDelete(selectedRespondents);
    setShowDeleteModal(true);
  };

  // Função de confirmação de exclusão
  const handleConfirmDelete = async (confirmationText: string) => {
    try {
      let result;
      
      if (respondentsToDelete.length === 1) {
        result = await deleteSingleRespondent(respondentsToDelete[0]);
      } else {
        result = await deleteMultipleRespondents(respondentsToDelete, confirmationText);
      }
      
      if (result.success) {
        // Atualizar lista de respondentes
        await loadRespondents();
        
        // Limpar seleções
        setSelectedRespondents([]);
        setRespondentsToDelete([]);
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.error('Erro durante exclusão:', error);
    }
  };

  // Função para fechar modal
  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setShowDeleteModal(false);
      setRespondentsToDelete([]);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-100 via-blue-100 to-indigo-100 min-h-screen">
      {/* Seção Superior */}
      <section className="bg-hero py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link 
              to={`/admin/${userPlan === 'start-quantico' ? 'start' : userPlan === 'vortex-neural' ? 'vortex' : 'nexus'}`}
              className="flex items-center gap-2 text-brand-white hover:text-brand-white/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Voltar ao Painel</span>
            </Link>
          </div>
          
          <div className="text-center space-y-4">
            <div className="text-sm text-brand-white/90 font-medium">
              Sentiment CX
            </div>
            <h1 className="text-hero text-brand-white font-bold leading-tight">
              Cadastrar Respondentes - {planInfo.name}
            </h1>
            <p className="text-subtitle text-brand-white/90 max-w-2xl mx-auto">
              Adicione respondentes para suas pesquisas
            </p>
            <p className="text-sm text-brand-white/70">
              {planInfo.limits}
            </p>
          </div>
        </div>
      </section>

      {/* Seção Inferior */}
      <section className="bg-section-light py-12 px-6">
        <div className="account-content-wrapper max-w-6xl mx-auto space-y-8">
          {/* Magic Links */}
          <Card className="account-card-enhanced bg-brand-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-brand-dark-gray flex items-center gap-2">
                <LinkIcon className="w-6 h-6 text-primary" />
                Enviar Magic Link
              </CardTitle>
              <p className="text-brand-dark-gray/60">
                Envie links de acesso direto para respondentes participarem de pesquisas específicas
              </p>
            </CardHeader>
            <CardContent>
              {!showMagicLinkForm ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1">Magic Links - Acesso Seguro</h4>
                        <p className="text-blue-700 text-sm mb-3">
                          Envie links únicos e temporários por email para que respondentes acessem pesquisas específicas sem necessidade de cadastro.
                        </p>
                        <ul className="text-blue-600 text-xs space-y-1">
                          <li>• Links válidos por 24 horas</li>
                          <li>• Acesso direto à pesquisa selecionada</li>
                          <li>• Conformidade total com LGPD</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {surveys.length > 0 ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-brand-dark-gray">Selecione a Pesquisa</Label>
                        <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
                          <SelectTrigger className="py-3">
                            <SelectValue placeholder="Escolha uma pesquisa ativa" />
                          </SelectTrigger>
                          <SelectContent>
                            {surveys.map((survey) => (
                              <SelectItem key={survey.id} value={survey.id}>
                                {survey.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Button 
                        onClick={() => setShowMagicLinkForm(true)}
                        disabled={!selectedSurveyId}
                        variant="hero"
                        className="w-full md:w-auto px-8 py-3 text-lg font-semibold"
                      >
                        <Send className="w-5 h-5 mr-2" />
                        Enviar Magic Link
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <LinkIcon className="w-12 h-12 text-brand-dark-gray/30 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-brand-dark-gray mb-2">
                        Nenhuma pesquisa ativa
                      </h3>
                      <p className="text-brand-dark-gray/60 mb-4">
                        Você precisa ter pelo menos uma pesquisa ativa para enviar magic links.
                      </p>
                      <Link 
                        to={`/admin/${plan}`}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Criar Nova Pesquisa
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-brand-dark-gray">
                      Enviar para: {surveys.find(s => s.id === selectedSurveyId)?.title}
                    </h3>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowMagicLinkForm(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Cancelar
                    </Button>
                  </div>
                  
                  <MagicLinkRequest
                    surveyId={selectedSurveyId}
                    surveyTitle={surveys.find(s => s.id === selectedSurveyId)?.title || ''}
                    onSuccess={handleMagicLinkSuccess}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulário de Cadastro */}
          <Card className="account-card-enhanced bg-brand-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-brand-dark-gray flex items-center gap-2">
                <Plus className="w-6 h-6 text-primary" />
                Novo Respondente
              </CardTitle>
              <p className="text-brand-dark-gray/60">
                Cadastre respondentes que poderão participar das suas pesquisas
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-brand-dark-gray flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Nome Completo
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Maria Silva"
                      className="py-3"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-brand-dark-gray flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ex: maria@empresa.com"
                      className="py-3"
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  variant="hero"
                  className="w-full md:w-auto px-8 py-3 text-lg font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Adicionando...' : 'Adicionar Respondente'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Respondentes */}
          <Card className="bg-brand-white shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-brand-dark-gray">
                    Respondentes Cadastrados ({respondents.length})
                  </CardTitle>
                  <p className="text-brand-dark-gray/60">
                    Lista de todos os respondentes cadastrados
                  </p>
                </div>
                {respondents.length > 0 && (
                  <div className="flex items-center gap-3">
                    {selectedRespondents.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-brand-dark-gray">
                          {selectedRespondents.length} selecionado{selectedRespondents.length > 1 ? 's' : ''}
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteSelected}
                          disabled={isDeleting}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Excluir Selecionados
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingList ? (
                <div className="text-center py-8">
                  <div className="text-brand-dark-gray/60">Carregando respondentes...</div>
                </div>
              ) : respondents.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-brand-dark-gray/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-brand-dark-gray mb-2">
                    Nenhum respondente cadastrado
                  </h3>
                  <p className="text-brand-dark-gray/60">
                    Use o formulário acima para adicionar seu primeiro respondente.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedRespondents.length === respondents.length && respondents.length > 0}
                            onCheckedChange={handleSelectAll}
                            disabled={isDeleting}
                          />
                        </TableHead>
                        <TableHead className="font-semibold">Nome</TableHead>
                        <TableHead className="font-semibold">E-mail</TableHead>
                        <TableHead className="font-semibold">Cadastrado em</TableHead>
                        <TableHead className="font-semibold text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {respondents.map((respondent) => (
                        <TableRow key={respondent.id} className="hover:bg-brand-dark-gray/5">
                          <TableCell>
                            <Checkbox
                              checked={selectedRespondents.includes(respondent.id)}
                              onCheckedChange={(checked) => handleSelectRespondent(respondent.id, checked as boolean)}
                              disabled={isDeleting}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{respondent.name}</TableCell>
                          <TableCell className="text-brand-dark-gray/70">{respondent.email}</TableCell>
                          <TableCell className="text-brand-dark-gray/70">
                            {new Date(respondent.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(respondent.id, respondent.name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={isDeleting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Modal de Confirmação de Exclusão */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        deleteProgress={deleteProgress}
        respondentCount={respondentsToDelete.length}
      />
    </div>
  );
};

export default AdminRespondents;