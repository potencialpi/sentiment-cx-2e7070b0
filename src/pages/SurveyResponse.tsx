import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import { StarRating } from '@/components/ui/star-rating';
import SurveyResponseFallback from '@/components/SurveyResponseFallback';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: any;
  question_order: number;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: string;
  current_responses: number;
  max_responses: number;
}

const SurveyResponse = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [hasRLSError, setHasRLSError] = useState(false);
  const { toast } = useToast();

  const loadSurveyData = useCallback(async () => {
    if (!surveyId) return;
    try {
      // Buscar a pesquisa pelo ID (quando vem do magic link, surveyId é o ID real)
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('id, title, description, status, current_responses, max_responses')
        .eq('id', surveyId)
        .eq('status', 'active')
        .maybeSingle();

      if (surveyError) {
        console.error('Survey error:', surveyError);
        // Detectar erros de RLS
        if (surveyError.message && (
          surveyError.message.includes('row-level security') ||
          surveyError.message.includes('permission denied') ||
          surveyError.message.includes('insufficient privilege')
        )) {
          setHasRLSError(true);
          setError(surveyError.message);
        } else {
          setError('Erro ao carregar pesquisa');
        }
        return;
      }

      if (!surveyData) {
        setError('Pesquisa não encontrada ou não está mais ativa');
        return;
      }

      // Verificar se a pesquisa ainda pode receber respostas
      if (surveyData.current_responses >= surveyData.max_responses) {
        setError('Esta pesquisa já atingiu o limite máximo de respostas');
        return;
      }

      setSurvey(surveyData);

      // Carregar questões da pesquisa
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, question_type, options, question_order')
        .eq('survey_id', surveyData.id)
        .order('question_order', { ascending: true });

      if (questionsError) {
        console.error('Questions error:', questionsError);
        // Detectar erros de RLS
        if (questionsError.message && (
          questionsError.message.includes('row-level security') ||
          questionsError.message.includes('permission denied') ||
          questionsError.message.includes('insufficient privilege')
        )) {
          setHasRLSError(true);
          setError(questionsError.message);
        } else {
          setError('Erro ao carregar questões');
        }
        return;
      }

      setQuestions(questionsData?.map(q => ({
        ...q,
        options: q.options as any
      })) || []);
    } catch (error) {
      console.error('Load error:', error);
      setError('Erro inesperado ao carregar pesquisa');
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    loadSurveyData();
  }, [loadSurveyData]);

  const handleResponseChange = (questionId: string, value: string | string[]) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleMultipleChoiceChange = (questionId: string, option: string, checked: boolean) => {
    setResponses(prev => {
      const currentValues = prev[questionId] || [];
      if (checked) {
        return {
          ...prev,
          [questionId]: [...currentValues, option]
        };
      } else {
        return {
          ...prev,
          [questionId]: Array.isArray(currentValues) ? currentValues.filter((v: string) => v !== option) : []
        };
      }
    });
  };

  const validateResponses = () => {
    const unanswered = questions.filter(q => {
      const response = responses[q.id];
      if (!response) return true;
      if (Array.isArray(response) && response.length === 0) return true;
      if (typeof response === 'string' && response.trim() === '') return true;
      return false;
    });

    return unanswered;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const unanswered = validateResponses();
    if (unanswered.length > 0) {
      toast({
        title: "Resposta incompleta",
        description: `Por favor, responda ${unanswered.length === 1 ? 'a questão' : 'as questões'} em branco.`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (!survey) return;

      // Gerar ID único para o respondente (anônimo)
      const respondentId = crypto.randomUUID();

      // Inserir cada resposta individualmente
      const responseData = {
        survey_id: survey.id,
        responses: responses,
        respondent_id: respondentId
      };

      const { data: responseRecord, error: responseError } = await supabase
        .from('responses')
        .insert(responseData)
        .select('id')
        .single();

      if (responseError) {
        console.error('Response error:', responseError);
        toast({
          title: "Erro ao enviar resposta",
          description: responseError.message,
          variant: "destructive",
        });
        return;
      }

      // Coletar respostas de texto para análise de sentimento
      const textResponses: string[] = [];
      questions.forEach(question => {
        if (question.question_type === 'text' && responses[question.id]) {
          const textResponse = responses[question.id] as string;
          if (textResponse.trim()) {
            textResponses.push(textResponse);
          }
        }
      });

      // Executar análise de sentimento se houver respostas de texto
      if (textResponses.length > 0 && responseRecord?.id) {
        console.log('🔍 Iniciando análise de sentimento:', {
          responseId: responseRecord.id,
          textResponsesCount: textResponses.length,
          texts: textResponses
        });
        
        try {
          const { data: sentimentData, error: sentimentError } = await supabase.functions.invoke('analyze-sentiment', {
            body: {
              responseId: responseRecord.id,
              texts: textResponses
            }
          });

          if (sentimentError) {
            console.error('❌ Erro na análise de sentimento:', sentimentError);
          } else {
            console.log('✅ Análise de sentimento executada com sucesso:', sentimentData);
          }
        } catch (sentimentError) {
          console.error('❌ Erro na chamada da função de análise de sentimento:', sentimentError);
          // Não bloquear o envio da resposta se a análise falhar
        }
      } else {
        console.log('⏭️ Pulando análise de sentimento - sem respostas de texto ou ID de resposta inválido');
      }

      // Atualizar contador de respostas da pesquisa
      const { error: updateError } = await supabase
        .from('surveys')
        .update({ 
          current_responses: survey.current_responses + 1 
        })
        .eq('id', survey.id);

      if (updateError) {
        console.error('Update error:', updateError);
      }

      setSubmitted(true);
      toast({
        title: "Resposta enviada com sucesso!",
        description: "Obrigado por participar da nossa pesquisa.",
      });

    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns momentos.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const { id, question_text, question_type, options } = question;
    
    // Converter options para array de strings se necessário
    const optionsArray = Array.isArray(options) ? options : 
                        (options && typeof options === 'object' && (options as any).choices) ? (options as any).choices :
                        [];

    switch (question_type) {
      case 'single_choice':
        return (
          <div key={id} className="space-y-4">
            <Label className="text-brand-dark-gray font-medium text-base">
              {question_text}
            </Label>
            <RadioGroup
              value={(responses[id] as string) || ''}
              onValueChange={(value) => handleResponseChange(id, value)}
              className="space-y-3"
            >
              {optionsArray?.slice(0, 4).map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-3">
                  <RadioGroupItem 
                    value={option} 
                    id={`${id}-${index}`}
                    className="text-primary"
                  />
                  <Label 
                    htmlFor={`${id}-${index}`}
                    className="text-brand-dark-gray cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'multiple_choice':
        return (
          <div key={id} className="space-y-4">
            <Label className="text-brand-dark-gray font-medium text-base">
              {question_text}
            </Label>
            <p className="text-sm text-brand-dark-gray/60">
              Selecione todas as opções que se aplicam:
            </p>
            <div className="space-y-3">
              {optionsArray?.slice(0, 4).map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-3">
                  <Checkbox
                    id={`${id}-${index}`}
                    checked={(responses[id] || []).includes(option)}
                    onCheckedChange={(checked) => 
                      handleMultipleChoiceChange(id, option, checked as boolean)
                    }
                    className="text-primary"
                  />
                  <Label 
                    htmlFor={`${id}-${index}`}
                    className="text-brand-dark-gray cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'text':
        return (
          <div key={id} className="space-y-4">
            <Label 
              htmlFor={id}
              className="text-brand-dark-gray font-medium text-base"
            >
              {question_text}
            </Label>
            <Textarea
              id={id}
              value={responses[id] || ''}
              onChange={(e) => handleResponseChange(id, e.target.value)}
              placeholder="Digite sua resposta aqui..."
              className="min-h-[120px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-brand-dark-gray/60">
              Máximo 1000 caracteres
            </p>
          </div>
        );

      case 'rating':
        return (
          <div key={id} className="space-y-4">
            <Label 
              htmlFor={id}
              className="text-brand-dark-gray font-medium text-base"
            >
              {question_text}
            </Label>
            <p className="text-sm text-brand-dark-gray/60">
              Avalie de 1 a 5 estrelas:
            </p>
            <StarRating
              value={parseInt(responses[id] as string) || 0}
              onChange={(rating) => handleResponseChange(id, rating.toString())}
              className="justify-start"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Mostrar fallback se houver erro de RLS
  if (hasRLSError) {
    return <SurveyResponseFallback surveyId={surveyId || ''} error={error || undefined} />;
  }

  if (error) {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <section className="bg-hero py-12 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-sm text-brand-white/90 font-medium mb-4">
              Sentiment CX
            </div>
            <h1 className="text-hero text-brand-white font-bold leading-tight mb-4">
              Pesquisa Não Disponível
            </h1>
          </div>
        </section>

        {/* Error Content */}
        <section className="bg-section-light py-20 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="bg-brand-white shadow-xl">
              <CardContent className="p-12">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-brand-dark-gray mb-4">
                  Oops! Algo deu errado
                </h2>
                <p className="text-brand-dark-gray/70 mb-6">
                  {error}
                </p>
                <Button 
                  onClick={() => navigate('/')}
                  variant="hero"
                >
                  Voltar ao Início
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <section className="bg-hero py-12 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-sm text-brand-white/90 font-medium mb-4">
              Sentiment CX
            </div>
            <h1 className="text-hero text-brand-white font-bold leading-tight mb-4">
              Resposta Enviada!
            </h1>
          </div>
        </section>

        {/* Success Content */}
        <section className="bg-section-light py-20 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="bg-brand-white shadow-xl">
              <CardContent className="p-12">
                <CheckCircle className="w-16 h-16 text-brand-green mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-brand-dark-gray mb-4">
                  Obrigado pela sua participação!
                </h2>
                <p className="text-brand-dark-gray/70 mb-6">
                  Sua resposta foi enviada com sucesso. Agradecemos seu tempo e contribuição para nossa pesquisa.
                </p>
                <Button 
                  onClick={() => navigate('/')}
                  variant="hero"
                >
                  Voltar ao Início
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-hero py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-sm text-brand-white/90 font-medium mb-4">
            Sentiment CX
          </div>
          <h1 className="text-hero text-brand-white font-bold leading-tight mb-4">
            Responder Pesquisa
          </h1>
          {survey && (
            <div className="space-y-2">
              <h2 className="text-2xl text-brand-white font-semibold">
                {survey.title}
              </h2>
              {survey.description && (
                <p className="text-subtitle text-brand-white/90">
                  {survey.description}
                </p>
              )}
              <p className="text-sm text-brand-white/70">
                {survey.current_responses} de {survey.max_responses} respostas coletadas
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Form Content */}
      <section className="bg-section-light py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-brand-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-brand-dark-gray flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Questionário
              </CardTitle>
              <p className="text-brand-dark-gray/60">
                Por favor, responda todas as questões abaixo
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {questions.map((question, index) => (
                  <div key={question.id} className="p-6 bg-brand-white rounded-lg border border-border">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        {renderQuestion(question)}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-center pt-8">
                  <Button 
                    type="submit" 
                    variant="hero"
                    size="lg"
                    className="px-12 py-4 text-lg font-semibold"
                    disabled={submitting}
                  >
                    {submitting ? 'Enviando...' : 'Enviar Respostas'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default SurveyResponse;