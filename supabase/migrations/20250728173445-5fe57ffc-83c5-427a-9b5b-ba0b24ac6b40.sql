-- Atualizar tabela surveys para incluir link único se não existir
-- E garantir que responses permite acesso anônimo

-- Verificar se a coluna unique_link já existe na tabela surveys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'surveys' AND column_name = 'unique_link'
    ) THEN
        ALTER TABLE public.surveys ADD COLUMN unique_link text UNIQUE;
    END IF;
END $$;

-- Função para gerar link único para pesquisas
CREATE OR REPLACE FUNCTION public.generate_survey_link(_survey_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  unique_link text;
BEGIN
  -- Gerar um link único baseado em timestamp e UUID
  unique_link := encode(gen_random_bytes(16), 'hex');
  
  -- Atualizar a pesquisa com o link único
  UPDATE public.surveys 
  SET unique_link = unique_link 
  WHERE id = _survey_id;
  
  RETURN unique_link;
END;
$$;

-- Garantir que as políticas de responses permitem acesso anônimo para inserção
-- (já existem, mas vamos recriar para garantir)
DROP POLICY IF EXISTS "Anyone can insert responses" ON public.responses;
CREATE POLICY "Anyone can insert responses" 
ON public.responses 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Política para permitir que qualquer pessoa visualize pesquisas ativas via link único
DROP POLICY IF EXISTS "Anyone can view active surveys by link" ON public.surveys;
CREATE POLICY "Anyone can view active surveys by link" 
ON public.surveys 
FOR SELECT 
TO anon, authenticated
USING (status = 'active' AND unique_link IS NOT NULL);

-- Política para permitir que qualquer pessoa visualize questões de pesquisas ativas
DROP POLICY IF EXISTS "Anyone can view questions from active surveys" ON public.questions;
CREATE POLICY "Anyone can view questions from active surveys" 
ON public.questions 
FOR SELECT 
TO anon, authenticated
USING (
  survey_id IN (
    SELECT id FROM public.surveys 
    WHERE status = 'active' AND unique_link IS NOT NULL
  )
);

-- Função para validar se uma pesquisa está ativa e pode receber respostas
CREATE OR REPLACE FUNCTION public.can_receive_responses(_survey_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.surveys 
    WHERE id = _survey_id 
      AND status = 'active' 
      AND unique_link IS NOT NULL
      AND current_responses < max_responses
  );
$$;