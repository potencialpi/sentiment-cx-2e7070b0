import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SentimentResult {
  label: 'positive' | 'neutral' | 'negative';
  score: number; // -1.0 a 1.0
  confidence: number; // 0.0 a 1.0
}

// Palavras-chave para análise básica de sentimento em português
const POSITIVE_WORDS = [
  'bom', 'boa', 'excelente', 'ótimo', 'ótima', 'maravilhoso', 'fantástico', 'perfeito', 'perfeita',
  'amor', 'amo', 'gosto', 'adoro', 'feliz', 'alegre', 'satisfeito', 'satisfeita', 'contente',
  'incrível', 'impressionante', 'surpreendente', 'recomendo', 'recomendaria', 'positivo', 'positiva',
  'sucesso', 'vencedor', 'vitória', 'conquista', 'realização', 'prazer', 'diversão', 'legal',
  'bacana', 'show', 'top', 'demais', 'sensacional', 'espetacular', 'formidável', 'genial'
];

const NEGATIVE_WORDS = [
  'ruim', 'péssimo', 'péssima', 'horrível', 'terrível', 'odioso', 'odeio', 'detesto', 'nojo',
  'triste', 'chateado', 'chateada', 'irritado', 'irritada', 'nervoso', 'nervosa', 'bravo', 'brava',
  'decepcionado', 'decepcionada', 'frustrado', 'frustrada', 'insatisfeito', 'insatisfeita',
  'problema', 'erro', 'falha', 'defeito', 'bug', 'lento', 'devagar', 'demorado', 'complicado',
  'difícil', 'impossível', 'inútil', 'desnecessário', 'caro', 'custoso', 'desperdício'
];

const INTENSIFIERS = [
  'muito', 'super', 'extremamente', 'totalmente', 'completamente', 'absolutamente',
  'bastante', 'bem', 'demais', 'pra caramba', 'para caramba'
];

const NEGATORS = [
  'não', 'nunca', 'jamais', 'nem', 'nenhum', 'nenhuma', 'nada', 'zero'
];

function analyzeSentiment(text: string): SentimentResult {
  if (!text || text.trim().length === 0) {
    return {
      label: 'neutral',
      score: 0,
      confidence: 0
    };
  }

  // Normalizar texto: minúsculas, remover pontuação
  const normalizedText = text.toLowerCase()
    .replace(/[.,!?;:()[\]{}"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalizedText.split(' ');
  
  let positiveScore = 0;
  let negativeScore = 0;
  let totalWords = 0;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word.length < 2) continue; // Ignorar palavras muito curtas
    
    totalWords++;
    
    // Verificar se há negador antes da palavra
    const hasNegator = i > 0 && NEGATORS.includes(words[i - 1]);
    
    // Verificar se há intensificador antes da palavra
    const hasIntensifier = i > 0 && INTENSIFIERS.includes(words[i - 1]);
    const intensifierMultiplier = hasIntensifier ? 1.5 : 1.0;
    
    // Calcular score base
    let wordScore = 0;
    
    if (POSITIVE_WORDS.includes(word)) {
      wordScore = 1 * intensifierMultiplier;
      if (hasNegator) wordScore = -wordScore; // Inverter se houver negador
    } else if (NEGATIVE_WORDS.includes(word)) {
      wordScore = -1 * intensifierMultiplier;
      if (hasNegator) wordScore = -wordScore; // Inverter se houver negador
    }
    
    // Acumular scores
    if (wordScore > 0) {
      positiveScore += wordScore;
    } else if (wordScore < 0) {
      negativeScore += Math.abs(wordScore);
    }
  }
  
  // Calcular score final normalizado
  const totalSentimentWords = positiveScore + negativeScore;
  
  if (totalSentimentWords === 0) {
    return {
      label: 'neutral',
      score: 0,
      confidence: 0.5
    };
  }
  
  // Score final entre -1 e 1
  const finalScore = (positiveScore - negativeScore) / Math.max(totalSentimentWords, 1);
  
  // Determinar label baseado no score
  let label: 'positive' | 'neutral' | 'negative';
  if (finalScore > 0.1) {
    label = 'positive';
  } else if (finalScore < -0.1) {
    label = 'negative';
  } else {
    label = 'neutral';
  }
  
  // Calcular confiança baseada na quantidade de palavras de sentimento encontradas
  const sentimentWordRatio = totalSentimentWords / Math.max(totalWords, 1);
  const confidence = Math.min(0.9, Math.max(0.1, sentimentWordRatio * 2));
  
  return {
    label,
    score: Math.max(-1, Math.min(1, finalScore)), // Garantir que está entre -1 e 1
    confidence
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const { responseId, texts } = await req.json();

      if (!responseId || !texts || !Array.isArray(texts)) {
        return new Response(
          JSON.stringify({ error: 'responseId and texts array are required' }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Analisar sentimento de cada texto
      const results = texts.map((text: string) => analyzeSentiment(text));
      
      // Calcular estatísticas gerais
      const positive = results.filter(r => r.label === 'positive').length;
      const neutral = results.filter(r => r.label === 'neutral').length;
      const negative = results.filter(r => r.label === 'negative').length;
      
      const averageScore = results.reduce((acc, r) => acc + r.score, 0) / results.length;
      const averageConfidence = results.reduce((acc, r) => acc + r.confidence, 0) / results.length;

      const summary = {
        positive,
        neutral,
        negative,
        averageScore,
        averageConfidence,
        total: results.length
      };

      // Salvar análise de sentimento no banco
      const { error: insertError } = await supabaseClient
        .from('sentiment_analysis')
        .insert({
          response_id: responseId,
          sentiment_results: results,
          sentiment_summary: summary,
          analyzed_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error saving sentiment analysis:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save sentiment analysis' }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          results, 
          summary 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // GET - buscar análises existentes
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const responseId = url.searchParams.get('responseId');
      const surveyId = url.searchParams.get('surveyId');

      if (responseId) {
        // Buscar análise específica de uma resposta
        const { data, error } = await supabaseClient
          .from('sentiment_analysis')
          .select('*')
          .eq('response_id', responseId)
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Sentiment analysis not found' }), 
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        return new Response(
          JSON.stringify(data), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (surveyId) {
        // Buscar todas as análises de uma pesquisa
        const { data, error } = await supabaseClient
          .from('sentiment_analysis')
          .select(`
            *,
            responses!inner(survey_id)
          `)
          .eq('responses.survey_id', surveyId);

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch sentiment analyses' }), 
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        return new Response(
          JSON.stringify(data), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'responseId or surveyId parameter required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-sentiment function:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});