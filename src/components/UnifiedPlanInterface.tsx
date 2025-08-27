import React, { useState, useCallback, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  Copy, 
  ExternalLink, 
  Download, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  Activity, 
  ArrowLeft, 
  LogOut,
  Brain,
  Loader2 
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import AnalyticsDashboard from './AnalyticsDashboard';
import VortexNeuralAnalytics from './VortexNeuralAnalytics';
import { NexusInfinitoAnalytics } from './NexusInfinitoAnalytics';
import { useSurveyManager } from '@/hooks/useSurveyManager';
import { Question, Survey, uiUtils, surveyDataUtils, executeAIAnalysis } from '@/utils/surveyUtils';

// Interfaces movidas para surveyUtils.ts

interface PlanConfig {
  planName: string;
  planTitle: string;
  planDescription: string;
  maxQuestions: number;
  maxResponses: number;
  maxSurveysPerMonth: number;
  backRoute: string;
  features: {
    analytics: {
      basic: string[];
      advanced: string[];
      charts: string[];
      export: string[];
    };
    sentiment: {
      levels: string[];
      segmentation: string[];
    };
    statistics: {
      basic: string[];
      advanced: string[];
    };
    aiFeatures?: {
      [key: string]: string;
    };
  };
}

interface UnifiedPlanInterfaceProps {
  config: PlanConfig;
}

const UnifiedPlanInterface: React.FC<UnifiedPlanInterfaceProps> = ({ config }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("create");
  const [selectedSurveyForAnalysis, setSelectedSurveyForAnalysis] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<{[key: string]: any}>({});
  
  // Usando o hook customizado para gerenciar pesquisas
  const {
    surveyTitle,
    surveyDescription,
    questions,
    activeSurveys,
    isLoading,
    setSurveyTitle,
    setSurveyDescription,
    addQuestion,
    removeQuestion,
    updateQuestion,
    addOption,
    removeOption,
    updateOption,
    saveSurvey,
    fetchActiveSurveys,
    resetForm
  } = useSurveyManager();

  // fetchActiveSurveys agora está no hook customizado

  // Funções de manipulação de questões agora estão no hook customizado
  
  // Wrapper para addQuestion com validação de limite do plano
  const handleAddQuestion = useCallback(() => {
    if (questions.length >= config.maxQuestions) {
      toast({
        title: "Limite atingido",
        description: `Você pode criar no máximo ${config.maxQuestions} questões neste plano.`,
        variant: "destructive",
      });
      return;
    }
    addQuestion();
  }, [questions.length, config.maxQuestions, addQuestion]);

  // Funções de validação, salvamento e utilitárias agora estão nos utilitários
  
  // Wrapper para saveSurvey com mudança de aba após sucesso
  const handleSaveSurvey = useCallback(async () => {
    await saveSurvey();
    setActiveTab('active');
  }, [saveSurvey]);

  // Wrapper para executeAIAnalysis com estado local
  const handleExecuteAIAnalysis = useCallback((analysisKey: string, analysisName: string) => {
    return executeAIAnalysis(analysisKey, analysisName, setAnalysisLoading, setAnalysisResults, toast);
  }, [toast]);

  return (
    <div className="min-h-screen bg-brand-bg-gray">
      {/* Header Section - Padrão do Design System */}
      <header className="bg-brand-dark-blue text-brand-white py-6 sm:py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => navigate(config.backRoute)}
                className="bg-brand-dark-blue text-brand-white border-brand-white/20 hover:bg-brand-white/10 text-xs sm:text-sm px-3 py-2 sm:px-4"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Voltar</span>
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={async () => {
                  const { robustLogout } = await import('@/lib/authUtils');
                  await robustLogout(navigate);
                }}
                className="bg-brand-green text-brand-white hover:bg-brand-green/90 border-brand-green text-xs sm:text-sm px-3 py-2 sm:px-4"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Sair</span>
              </Button>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-nav font-semibold mb-2 sm:mb-4">Sentiment CX</h1>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-hero font-bold mb-3 sm:mb-4 flex flex-col sm:flex-row items-center justify-center gap-2">
              <Activity className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
              <span className="text-center">{config.planTitle}</span>
            </h2>
            <p className="text-sm sm:text-base md:text-subtitle text-brand-white/80 max-w-xs sm:max-w-2xl md:max-w-3xl mx-auto px-2 sm:px-0">
              {config.planDescription}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Section - Padrão do Design System */}
      <main className="bg-brand-bg-gray py-4 sm:py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0 mb-4 sm:mb-6 md:mb-8 h-auto sm:h-10 p-1">
              <TabsTrigger value="create" className="text-xs sm:text-sm py-2 sm:py-1.5 px-2 sm:px-3 h-auto sm:h-8">
                <span className="hidden sm:inline">Criar Pesquisa</span>
                <span className="sm:hidden">Criar</span>
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs sm:text-sm py-2 sm:py-1.5 px-2 sm:px-3 h-auto sm:h-8">
                <span className="hidden sm:inline">Pesquisas Ativas</span>
                <span className="sm:hidden">Ativas</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2 sm:py-1.5 px-2 sm:px-3 h-auto sm:h-8">
                <span className="hidden sm:inline">Análises Avançadas</span>
                <span className="sm:hidden">Análises</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-brand-dark-gray">
                    <BarChart3 className="h-5 w-5" />
                    Criar Nova Pesquisa
                  </CardTitle>
                  <CardDescription className="text-brand-dark-gray/70">
                    Crie pesquisas com questões e respostas ilimitadas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="survey-title" className="text-xs sm:text-sm font-medium text-brand-dark-gray">
                        Nome da Pesquisa
                      </Label>
                      <Input
                        id="survey-title"
                        placeholder="Ex: Pesquisa de Satisfação Q1 2024"
                        value={surveyTitle}
                        onChange={(e) => setSurveyTitle(e.target.value)}
                        className="bg-white text-sm sm:text-base min-h-[44px] touch-manipulation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="survey-description" className="text-xs sm:text-sm font-medium text-brand-dark-gray">
                        Descrição (Opcional)
                      </Label>
                      <Input
                        id="survey-description"
                        placeholder="Breve descrição da pesquisa"
                        value={surveyDescription}
                        onChange={(e) => setSurveyDescription(e.target.value)}
                        className="bg-white text-sm sm:text-base min-h-[44px] touch-manipulation"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                      <h3 className="text-base sm:text-lg font-semibold text-brand-dark-gray">
                        Questões ({questions.length}/{config.maxQuestions === 999999 ? 'Ilimitadas' : config.maxQuestions})
                      </h3>
                      <Button
                        onClick={addQuestion}
                        className="bg-brand-green hover:bg-brand-green/90 text-brand-white font-medium text-xs sm:text-sm px-3 sm:px-4 py-2 min-h-[44px] touch-manipulation w-full sm:w-auto"
                        disabled={config.maxQuestions !== 999999 && questions.length >= config.maxQuestions}
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">Adicionar Questão</span>
                        <span className="xs:hidden">Adicionar</span>
                      </Button>
                    </div>

                    {questions.map((question, index) => (
                      <Card key={question.id} className="border-l-4 border-l-brand-green bg-brand-white shadow-sm">
                        <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                          <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-brand-dark-gray text-sm sm:text-base">Questão {index + 1}</h4>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeQuestion(question.id)}
                                className="min-h-[44px] touch-manipulation px-3 py-2"
                              >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`question-${question.id}`} className="text-xs sm:text-sm font-medium text-brand-dark-gray">
                                  Texto da Questão
                                </Label>
                                <Textarea
                                  id={`question-${question.id}`}
                                  placeholder="Digite sua questão aqui..."
                                  value={question.text}
                                  onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                                  className="bg-white min-h-[80px] sm:min-h-[80px] text-sm sm:text-base touch-manipulation resize-none"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`type-${question.id}`} className="text-xs sm:text-sm font-medium text-brand-dark-gray">
                                  Tipo de Resposta
                                </Label>
                                <Select
                                  value={question.type}
                                  onValueChange={(value) => {
                                    updateQuestion(question.id, 'type', value);
                                    if (value === 'single_choice' || value === 'multiple_choice') {
                                      updateQuestion(question.id, 'options', ['Opção 1', 'Opção 2']);
                                    } else {
                                      updateQuestion(question.id, 'options', []);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="mt-1 min-h-[44px] touch-manipulation text-sm sm:text-base">
                                    <SelectValue placeholder="Escolha o tipo de resposta" />
                                  </SelectTrigger>
                                  <SelectContent className="z-[9999] bg-white border border-gray-500 shadow-lg">
                                    <SelectItem value="text">Texto Aberto</SelectItem>
                                    <SelectItem value="rating">Avaliação 1-5 Estrelas</SelectItem>
                                    <SelectItem value="single_choice">Escolha Única</SelectItem>
                                    <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium text-brand-dark-gray">
                                    Opções de Resposta ({question.options.length}/5)
                                  </Label>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addOption(question.id)}
                                    disabled={question.options.length >= 5}
                                    className="bg-brand-green text-brand-white hover:bg-brand-green/90 border-brand-green"
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Adicionar Opção
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  {question.options.map((option, optionIndex) => (
                                    <div key={optionIndex} className="flex items-center space-x-2">
                                      {question.type === 'single_choice' ? (
                                        <RadioGroup value="" className="flex items-center">
                                          <RadioGroupItem value={`option-${optionIndex}`} disabled />
                                        </RadioGroup>
                                      ) : question.type === 'multiple_choice' ? (
                                        <Checkbox disabled />
                                      ) : null}
                                      <Input
                                        placeholder={`Opção ${optionIndex + 1}`}
                                        value={option}
                                        onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                                        className="flex-1 bg-white"
                                      />
                                      {question.options.length > 2 && (
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => removeOption(question.id, optionIndex)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {question.type === 'rating' && (
                              <div className="mt-4">
                                <Label className="text-sm font-medium text-brand-dark-gray mb-3 block">
                                  Prévia da Avaliação por Estrelas:
                                </Label>
                                <div className="p-4 bg-gray-500/20 rounded-lg">
                                  <p className="text-sm mb-3 text-gray-600">{question.text || "Sua questão aparecerá aqui"}</p>
                                  <StarRating value={0} disabled className="justify-start" />
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-center pt-4 sm:pt-6">
                    <Button
                      onClick={handleSaveSurvey}
                      disabled={isLoading}
                      className="bg-brand-green hover:bg-brand-green/90 hover:shadow-lg text-brand-white font-medium px-6 sm:px-8 py-3 text-base sm:text-lg transition-all duration-300 min-h-[48px] touch-manipulation w-full sm:w-auto max-w-xs sm:max-w-none"
                    >
                      {isLoading ? 'Salvando...' : 'Salvar Pesquisa'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="active" className="space-y-6">
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Pesquisas Ativas
                  </CardTitle>
                  <CardDescription className="text-brand-dark-gray/70">
                    Gerencie suas pesquisas em andamento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">
                      <p className="text-brand-dark-gray">Carregando pesquisas...</p>
                    </div>
                  ) : activeSurveys.length === 0 ? (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                      <p className="text-brand-dark-gray mb-4">Nenhuma pesquisa ativa encontrada.</p>
                      <Button
                        onClick={() => setActiveTab('create')}
                        className="bg-brand-green hover:bg-brand-green/90 text-brand-white"
                      >
                        Criar Primeira Pesquisa
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {activeSurveys.map((survey) => (
                        <Card key={survey.id} className="border-l-4 border-l-brand-green bg-brand-white shadow-sm">
                          <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                            <div className="space-y-3">
                              <h3 className="font-semibold text-brand-dark-gray text-sm sm:text-base line-clamp-2">{survey.title}</h3>
                              <div className="text-xs sm:text-sm text-brand-dark-gray space-y-1">
                                <p><strong>Criada em:</strong> {uiUtils.formatDate(survey.created_at)}</p>
                                <p><strong>Status:</strong> {survey.status}</p>
                                <p><strong>Respostas:</strong> {survey.current_responses}/{survey.max_responses === 999999 ? 'Ilimitado' : survey.max_responses}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => uiUtils.copyLinkToClipboard(survey.unique_link, toast)}
                                  className="flex-1 border-brand-dark-gray text-brand-dark-gray hover:bg-brand-dark-gray hover:text-brand-white text-xs sm:text-sm py-2 px-3 min-h-[44px] touch-manipulation"
                                >
                                  <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                  <span className="hidden xs:inline">Copiar Link</span>
                                  <span className="xs:hidden">Copiar</span>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card className="bg-brand-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Análises Avançadas
                  </CardTitle>
                  <CardDescription className="text-brand-dark-gray/70">
                    Análises detalhadas das suas pesquisas ativas com respostas
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                   {/* Seletor de pesquisa para análise */}
                   {activeSurveys.filter(survey => survey.current_responses > 0).length > 0 ? (
                     <div className="space-y-6">
                       <div className="flex flex-col space-y-4">
                         <label className="text-sm font-medium text-brand-dark-gray">
                           Selecione uma pesquisa para análise:
                         </label>
                         <select
                           value={selectedSurveyForAnalysis}
                           onChange={(e) => setSelectedSurveyForAnalysis(e.target.value)}
                           className="w-full p-3 border border-gray-500 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                         >
                           <option value="">Escolha uma pesquisa...</option>
                           {activeSurveys
                             .filter(survey => survey.current_responses > 0)
                             .map((survey) => (
                               <option key={survey.id} value={survey.id}>
                                 {survey.title} ({survey.current_responses} respostas)
                               </option>
                             ))}
                         </select>
                       </div>

                       {/* Dashboard de análise */}
                       {selectedSurveyForAnalysis && (
                         <div className="space-y-6">
                           {config.planName === "Nexus Infinito" ? (
                             <NexusInfinitoAnalytics surveyId={selectedSurveyForAnalysis} />
                           ) : config.planName === "Vortex Neural" ? (
                             <VortexNeuralAnalytics surveyId={selectedSurveyForAnalysis} />
                           ) : (
                             <AnalyticsDashboard surveyId={selectedSurveyForAnalysis} />
                           )}
                           
                           {config.features.aiFeatures && (
                             <Card>
                               <CardHeader>
                                 <CardTitle className="text-brand-purple">
                                   Análises Avançadas - {config.planTitle}
                                 </CardTitle>
                                 <CardDescription>
                                   Recursos exclusivos de IA e machine learning para insights profundos
                                 </CardDescription>
                               </CardHeader>
                               <CardContent className="grid gap-4 md:grid-cols-2">
                                 {Object.entries(config.features.aiFeatures).map(([key, feature]) => (
                                   <div key={key} className="p-4 border border-brand-light-purple/20 rounded-lg bg-brand-light-purple/5">
                                     <div className="flex items-center space-x-2 mb-2">
                                       <div className="w-3 h-3 bg-gradient-to-r from-brand-purple to-brand-light-purple rounded-full"></div>
                                       <span className="font-medium text-brand-dark-gray">{feature}</span>
                                     </div>
                                     <Button 
                                       variant="outline" 
                                       size="sm"
                                       className="w-full mt-2"
                                       onClick={() => handleExecuteAIAnalysis(key, feature)}
                                       disabled={analysisLoading === key}
                                     >
                                       {analysisLoading === key ? (
                                         <>
                                           <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                           Processando...
                                         </>
                                       ) : (
                                         <>
                                           <Brain className="w-4 h-4 mr-2" />
                                           Executar Análise
                                         </>
                                       )}
                                     </Button>
                                     {analysisResults[key] && (
                                       <div className="mt-3 p-3 bg-green-500/20 border border-green-500 rounded-lg">
                                         <div className="flex items-center space-x-2 mb-2">
                                           <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                           <span className="text-sm font-medium text-green-800">Análise Concluída</span>
                                         </div>
                                         <p className="text-xs text-green-700">{analysisResults[key].insights}</p>
                                         <div className="mt-2">
                                           <span className="text-xs text-green-600">
                                             Confiança: {Math.round(analysisResults[key].data?.confidence || 0)}%
                                           </span>
                                         </div>
                                       </div>
                                     )}
                                   </div>
                                 ))}
                               </CardContent>
                             </Card>
                           )}
                         </div>
                       )}
                     </div>
                  ) : (
                    <div className="text-center py-12">
                      <TrendingUp className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        Nenhuma pesquisa com respostas
                      </h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Para ver análises avançadas, você precisa ter pelo menos uma pesquisa ativa que tenha recebido respostas.
                      </p>
                       <div className="bg-gray-500/20 rounded-lg p-6 space-y-6">
                         <div>
                           <h4 className="font-semibold mb-4">Recursos disponíveis no {config.planName}:</h4>
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                             <div className="text-center">
                               <BarChart3 className="w-8 h-8 mx-auto mb-2 text-brand-green" />
                               <h5 className="font-medium text-sm mb-1">Estatísticas</h5>
                               <ul className="text-xs text-gray-600 space-y-1">
                                 {config.features.statistics.basic.slice(0, 3).map((stat, index) => (
                                   <li key={index}>• {stat}</li>
                                 ))}
                               </ul>
                             </div>
                             <div className="text-center">
                               <Activity className="w-8 h-8 mx-auto mb-2 text-brand-green" />
                               <h5 className="font-medium text-sm mb-1">Sentimentos</h5>
                               <ul className="text-xs text-gray-600 space-y-1">
                                 {config.features.sentiment.levels.slice(0, 3).map((level, index) => (
                                   <li key={index}>• {level}</li>
                                 ))}
                               </ul>
                             </div>
                             <div className="text-center">
                               <BarChart3 className="w-8 h-8 mx-auto mb-2 text-brand-green" />
                               <h5 className="font-medium text-sm mb-1">Treemaps</h5>
                               <ul className="text-xs text-gray-600 space-y-1">
                                 {config.features.analytics.charts.slice(0, 3).map((chart, index) => (
                                   <li key={index}>• {chart}</li>
                                 ))}
                               </ul>
                             </div>
                           </div>
                         </div>

                         {config.features.statistics.advanced && config.features.statistics.advanced.length > 0 && (
                           <div>
                             <h4 className="font-semibold mb-3">Análises Estatísticas Avançadas:</h4>
                             <div className="grid gap-2 md:grid-cols-2">
                               {config.features.statistics.advanced.slice(0, 8).map((feature, index) => (
                                 <div key={index} className="flex items-center space-x-2">
                                   <div className="w-2 h-2 bg-gradient-to-r from-brand-purple to-brand-light-purple rounded-full"></div>
                                   <span className="text-xs text-brand-dark-gray font-medium">{feature}</span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}

                         {config.features.aiFeatures && (
                           <div>
                             <h4 className="font-semibold mb-3">Recursos de IA Exclusivos:</h4>
                             <div className="grid gap-3 md:grid-cols-2">
                               {Object.entries(config.features.aiFeatures).map(([key, feature]) => (
                                 <div key={key} className="p-3 border border-brand-light-purple/20 rounded-lg bg-gradient-to-br from-brand-light-purple/10 to-brand-purple/10">
                                   <div className="flex items-center space-x-2">
                                     <div className="w-3 h-3 bg-gradient-to-r from-brand-purple to-brand-light-purple rounded-full"></div>
                                     <span className="text-xs font-medium text-brand-dark-gray">{feature}</span>
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
                       </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default memo(UnifiedPlanInterface);