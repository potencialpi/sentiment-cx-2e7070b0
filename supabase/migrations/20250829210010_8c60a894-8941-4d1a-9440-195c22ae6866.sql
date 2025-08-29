-- Sincronizar dados inconsistentes de usuários
-- Anderson deve ter nexus-infinito em ambas as tabelas (baseado no pagamento confirmado)

-- Primeiro, verificar dados atuais
DO $$
BEGIN
  RAISE NOTICE 'Verificando dados antes da sincronização...';
  
  -- Verificar Anderson
  PERFORM 
    RAISE NOTICE 'Anderson - Company: % | Profile: %', 
    (SELECT plan_name FROM companies WHERE user_id = '6625e5b6-5fc1-4caf-bf0f-db386b14dabe'),
    (SELECT plan_name FROM profiles WHERE user_id = '6625e5b6-5fc1-4caf-bf0f-db386b14dabe');
END $$;

-- Corrigir dados do Anderson - Company deve ser nexus-infinito
UPDATE public.companies 
SET 
  plan_name = 'nexus-infinito',
  updated_at = now()
WHERE user_id = '6625e5b6-5fc1-4caf-bf0f-db386b14dabe' 
  AND plan_name != 'nexus-infinito';

-- Garantir que o profile do Anderson também seja nexus-infinito
UPDATE public.profiles 
SET 
  plan_name = 'nexus-infinito',
  updated_at = now()
WHERE user_id = '6625e5b6-5fc1-4caf-bf0f-db386b14dabe' 
  AND plan_name != 'nexus-infinito';

-- Verificar e corrigir outros usuários com planos inconsistentes
-- Priorizar sempre o plano de maior valor entre company e profiles

UPDATE public.companies c
SET 
  plan_name = CASE 
    WHEN p.plan_name = 'nexus-infinito' OR c.plan_name = 'nexus-infinito' THEN 'nexus-infinito'
    WHEN p.plan_name = 'vortex-neural' OR c.plan_name = 'vortex-neural' THEN 'vortex-neural'
    ELSE 'start-quantico'
  END,
  updated_at = now()
FROM public.profiles p
WHERE c.user_id = p.user_id 
  AND c.plan_name != CASE 
    WHEN p.plan_name = 'nexus-infinito' OR c.plan_name = 'nexus-infinito' THEN 'nexus-infinito'
    WHEN p.plan_name = 'vortex-neural' OR c.plan_name = 'vortex-neural' THEN 'vortex-neural'
    ELSE 'start-quantico'
  END;

UPDATE public.profiles p
SET 
  plan_name = CASE 
    WHEN c.plan_name = 'nexus-infinito' OR p.plan_name = 'nexus-infinito' THEN 'nexus-infinito'
    WHEN c.plan_name = 'vortex-neural' OR p.plan_name = 'vortex-neural' THEN 'vortex-neural'
    ELSE 'start-quantico'
  END,
  updated_at = now()
FROM public.companies c
WHERE p.user_id = c.user_id 
  AND p.plan_name != CASE 
    WHEN c.plan_name = 'nexus-infinito' OR p.plan_name = 'nexus-infinito' THEN 'nexus-infinito'
    WHEN c.plan_name = 'vortex-neural' OR p.plan_name = 'vortex-neural' THEN 'vortex-neural'
    ELSE 'start-quantico'
  END;

-- Log da sincronização
INSERT INTO public.audit_log (event_type, table_name, details) 
VALUES ('DATA_SYNC', 'plan_synchronization', 
  jsonb_build_object(
    'action', 'sync_inconsistent_user_plans',
    'reason', 'fix_incorrect_plan_routing', 
    'timestamp', now(),
    'priority_logic', 'nexus-infinito > vortex-neural > start-quantico'
  )
);

-- Verificar resultado final
DO $$
DECLARE
  user_record RECORD;
BEGIN
  RAISE NOTICE 'Verificando dados após sincronização...';
  
  FOR user_record IN 
    SELECT 
      au.email,
      p.plan_name as profile_plan,
      c.plan_name as company_plan,
      p.user_id
    FROM auth.users au
    JOIN profiles p ON au.id = p.user_id
    JOIN companies c ON au.id = c.user_id
    WHERE au.email IN ('anderson@potencialpi.com.br', 'antonia.tuca@gmail.com', 'mirthirbass@gmail.com')
  LOOP
    RAISE NOTICE 'USER: % | Profile: % | Company: %', 
      user_record.email, 
      user_record.profile_plan, 
      user_record.company_plan;
  END LOOP;
END $$;