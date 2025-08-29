-- Sincronizar dados inconsistentes de usuários
-- Corrigir Anderson para ter nexus-infinito em ambas as tabelas

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

-- Corrigir Antônia para ter nexus-infinito consistente
UPDATE public.companies 
SET 
  plan_name = 'nexus-infinito',
  updated_at = now()
WHERE user_id = 'f82c54c4-e211-41aa-8126-4c8dfd2d18c7' 
  AND plan_name != 'nexus-infinito';

UPDATE public.profiles 
SET 
  plan_name = 'nexus-infinito',
  updated_at = now()
WHERE user_id = 'f82c54c4-e211-41aa-8126-4c8dfd2d18c7' 
  AND plan_name != 'nexus-infinito';

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