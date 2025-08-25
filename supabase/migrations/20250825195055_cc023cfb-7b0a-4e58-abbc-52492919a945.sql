-- Criar tabela para análise de sentimento
CREATE TABLE IF NOT EXISTS public.sentiment_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL,
  survey_id UUID NOT NULL,
  user_id UUID NOT NULL,
  sentiment_results JSONB NOT NULL,
  summary_stats JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar foreign keys
ALTER TABLE public.sentiment_analysis 
ADD CONSTRAINT fk_sentiment_analysis_response_id 
FOREIGN KEY (response_id) REFERENCES public.responses(id) ON DELETE CASCADE;

ALTER TABLE public.sentiment_analysis 
ADD CONSTRAINT fk_sentiment_analysis_survey_id 
FOREIGN KEY (survey_id) REFERENCES public.surveys(id) ON DELETE CASCADE;

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_response_id ON public.sentiment_analysis(response_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_survey_id ON public.sentiment_analysis(survey_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_user_id ON public.sentiment_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_created_at ON public.sentiment_analysis(created_at);

-- Habilitar RLS
ALTER TABLE public.sentiment_analysis ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: usuários só veem suas próprias análises
CREATE POLICY "Users can view own sentiment analysis" ON public.sentiment_analysis
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sentiment analysis" ON public.sentiment_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all sentiment analysis" ON public.sentiment_analysis
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_sentiment_analysis_updated_at
  BEFORE UPDATE ON public.sentiment_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.sentiment_analysis IS 'Tabela para armazenar resultados de análise de sentimento das respostas';
COMMENT ON COLUMN public.sentiment_analysis.sentiment_results IS 'Resultados detalhados da análise de sentimento em formato JSON';
COMMENT ON COLUMN public.sentiment_analysis.summary_stats IS 'Estatísticas resumidas da análise (médias, distribuições, etc.)';
COMMENT ON COLUMN public.sentiment_analysis.response_id IS 'ID da resposta analisada';
COMMENT ON COLUMN public.sentiment_analysis.survey_id IS 'ID da pesquisa para facilitar consultas';
COMMENT ON COLUMN public.sentiment_analysis.user_id IS 'ID do usuário dono da pesquisa para RLS';