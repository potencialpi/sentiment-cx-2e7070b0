-- Criar tabela de respondentes com RLS

CREATE TABLE public.respondents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Garantir que um email só pode ser cadastrado uma vez por usuário
  UNIQUE(user_id, email)
);

-- Habilitar RLS
ALTER TABLE public.respondents ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para respondents
CREATE POLICY "Users can view their own respondents" 
ON public.respondents 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own respondents" 
ON public.respondents 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own respondents" 
ON public.respondents 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own respondents" 
ON public.respondents 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Criar índices para performance
CREATE INDEX idx_respondents_user_id ON public.respondents(user_id);
CREATE INDEX idx_respondents_email ON public.respondents(email);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_respondents_updated_at
  BEFORE UPDATE ON public.respondents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();