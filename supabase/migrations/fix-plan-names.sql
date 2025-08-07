-- SCRIPT PARA EXECUTAR NO PAINEL DO SUPABASE
-- Copie e cole este código no SQL Editor do Supabase Dashboard

-- 1. Verificar dados atuais
SELECT 'Dados atuais na tabela profiles:' as info;
SELECT plan_name, COUNT(*) as count 
FROM public.profiles 
GROUP BY plan_name;

-- 2. Corrigir nomes de planos na tabela profiles
UPDATE public.profiles 
SET plan_name = 'start-quantico' 
WHERE plan_name = 'start_quantico';

UPDATE public.profiles 
SET plan_name = 'vortex-neural' 
WHERE plan_name = 'vortex_neural';

UPDATE public.profiles 
SET plan_name = 'nexus-infinito' 
WHERE plan_name = 'nexus_infinito';

-- 3. Corrigir nomes de planos na tabela companies (se existir)
UPDATE public.companies 
SET plan_name = 'start-quantico' 
WHERE plan_name = 'start_quantico';

UPDATE public.companies 
SET plan_name = 'vortex-neural' 
WHERE plan_name = 'vortex_neural';

UPDATE public.companies 
SET plan_name = 'nexus-infinito' 
WHERE plan_name = 'nexus_infinito';

-- 4. Alterar valor padrão da tabela profiles
ALTER TABLE public.profiles 
ALTER COLUMN plan_name SET DEFAULT 'start-quantico';

-- 5. Verificar dados após correção
SELECT 'Dados após correção:' as info;
SELECT plan_name, COUNT(*) as count 
FROM public.profiles 
GROUP BY plan_name;

-- 6. Adicionar comentários para documentar
COMMENT ON COLUMN public.profiles.plan_name IS 'Código do plano do usuário. Valores válidos: start-quantico, vortex-neural, nexus-infinito (sempre com hífen)';

-- Verificar se a tabela companies existe antes de adicionar comentário
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'companies' AND table_schema = 'public') THEN
        EXECUTE 'COMMENT ON COLUMN public.companies.plan_name IS ''Código do plano da empresa. Valores válidos: start-quantico, vortex-neural, nexus-infinito (sempre com hífen)''';
    END IF;
END $$;

SELECT 'Correção concluída! Todos os planos agora usam hífen (-) em vez de underscore (_)' as resultado;