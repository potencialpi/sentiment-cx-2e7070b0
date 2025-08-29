-- Verificar status dos triggers
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    CASE 
        WHEN tgenabled = 'O' THEN 'Enabled'
        WHEN tgenabled = 'D' THEN 'Disabled'
        WHEN tgenabled = 'A' THEN 'Always'
        WHEN tgenabled = 'R' THEN 'Replica'
        ELSE 'Unknown'
    END as status
FROM pg_trigger 
WHERE tgname IN ('on_auth_user_created_profile', 'on_auth_user_created_company')
ORDER BY tgname;

-- Verificar se as funções existem
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname IN ('handle_new_user_profile', 'handle_new_user_company')
ORDER BY proname;