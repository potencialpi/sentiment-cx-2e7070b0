import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SurveyAnalytics {
  totalResponses: number;
  averageRating: number;
  completionRate: number;
  sentimentOverview: {
    positive: number;
    neutral: number;
    negative: number;
  };
  questions: Array<{
    id: string;
    text: string;
    type: string;
    responses: Array<{
      id: string;
      answer_text: string;
      answer_rating?: number | null;
      answer_choices?: any;
      sentiment_label?: 'positive' | 'neutral' | 'negative';
      created_at: string;
    }>;
    statistics: {
      totalResponses: number;
      averageRating?: number;
      mostCommonAnswer?: string;
      sentimentBreakdown?: {
        positive: number;
        neutral: number;
        negative: number;
      };
    };
  }>;
  responsesByDate: Array<{
    date: string;
    count: number;
  }>;
}

export const useSurveyAnalytics = (surveyId: string) => {
  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!surveyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch survey data
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single();

      if (surveyError) throw surveyError;

      // Fetch questions and responses
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select(`
          *,
          question_responses (
            id,
            answer_text,
            answer_rating,
            answer_choices,
            sentiment_label,
            created_at
          )
        `)
        .eq('survey_id', surveyId)
        .order('question_order');

      if (questionsError) throw questionsError;

      // Process analytics data
      const processedAnalytics = processAnalyticsData(survey, questions || []);
      setAnalytics(processedAnalytics);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Erro ao carregar análises');
      toast({
        title: "Erro",
        description: "Não foi possível carregar as análises da pesquisa.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  const processAnalyticsData = useMemo(() => {
    return (survey: any, questions: any[]): SurveyAnalytics => {
      const allResponses = questions.flatMap(q => q.question_responses || []);
      const totalResponses = allResponses.length;

      // Calculate sentiment overview
      const sentimentCounts = allResponses.reduce(
        (acc, response) => {
          const sentiment = response.sentiment_label || 'neutral';
          acc[sentiment]++;
          return acc;
        },
        { positive: 0, neutral: 0, negative: 0 }
      );

      // Calculate responses by date
      const responsesByDate = allResponses.reduce((acc: Record<string, number>, response) => {
        const date = new Date(response.created_at).toLocaleDateString('pt-BR');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const responsesByDateArray = Object.entries(responsesByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Process questions with statistics
      const processedQuestions = questions.map(question => {
        const questionResponses = question.question_responses || [];
        const questionTotal = questionResponses.length;

        let statistics: any = {
          totalResponses: questionTotal
        };

        if (question.question_type === 'rating') {
          const ratings = questionResponses
            .map((r: any) => (r.answer_rating ?? (typeof r.answer_text === 'string' ? parseFloat(r.answer_text) : NaN)))
            .filter((r: number) => !isNaN(r));
          
          if (ratings.length > 0) {
            statistics.averageRating = ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length;
          }
        } else {
          // Find most common answer (supports answer_choices arrays and fallback to answer_text)
          const answerCounts = questionResponses.reduce((acc: Record<string, number>, response: any) => {
            if (Array.isArray(response?.answer_choices)) {
              const choices = response.answer_choices as any[];
              choices.forEach((c) => {
                const label = typeof c === 'string' ? c : (c?.label ?? c?.value ?? JSON.stringify(c));
                if (label && String(label).trim() !== '') {
                  acc[label] = (acc[label] || 0) + 1;
                }
              });
            } else if (typeof response?.answer_text === 'string' && response.answer_text.trim() !== '') {
              acc[response.answer_text] = (acc[response.answer_text] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>);

          const mostCommon = Object.entries(answerCounts)
            .sort(([,a], [,b]) => (b as number) - (a as number))[0];
          
          if (mostCommon) {
            statistics.mostCommonAnswer = mostCommon[0];
          }
        }

        // Calculate sentiment breakdown for this question
        const questionSentiment = questionResponses.reduce(
          (acc, response) => {
            const sentiment = response.sentiment_label || 'neutral';
            acc[sentiment]++;
            return acc;
          },
          { positive: 0, neutral: 0, negative: 0 }
        );

        statistics.sentimentBreakdown = questionSentiment;

        return {
          id: question.id,
          text: question.question_text,
          type: question.question_type,
          responses: questionResponses,
          statistics
        };
      });

      // Calculate average rating across all rating questions
      const ratingQuestions = processedQuestions.filter(q => q.type === 'rating');
      const averageRating = ratingQuestions.length > 0
        ? ratingQuestions.reduce((sum, q) => sum + (q.statistics.averageRating || 0), 0) / ratingQuestions.length
        : 0;

      return {
        totalResponses,
        averageRating,
        completionRate: survey.max_responses > 0 ? (totalResponses / survey.max_responses) * 100 : 0,
        sentimentOverview: sentimentCounts,
        questions: processedQuestions,
        responsesByDate: responsesByDateArray
      };
    };
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const refreshAnalytics = useCallback(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refreshAnalytics
  };
};