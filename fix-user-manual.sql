-- =====================================================
-- CORREÇÃO MANUAL DO USUÁRIO anderson@potencialpi.com.br
-- ID: c1d9c62f-f181-4a97-8fe7-d357d740f599
-- Data: 29/01/2025
-- =====================================================

-- IMPORTANTE: Execute este script diretamente no Supabase Dashboard
-- SQL Editor com privilégios de administrador

-- 1. VERIFICAR DADOS ATUAIS DO USUÁRIO
SELECT 
    id,
    email,
    instance_id,
    raw_user_meta_data,
    created_at,
    updated_at
FROM auth.users 
WHERE id = 'c1d9c62f-f181-4a97-8fe7-d357d740f599';

-- 2. REMOVER HASH DE SENHA DOS METADADOS (CRÍTICO)
-- Esta operação remove o campo 'original_password_hash' dos metadados
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'original_password_hash'
WHERE id = 'c1d9c62f-f181-4a97-8fe7-d357d740f599';

-- 3. CORRIGIR INSTANCE_ID INVÁLIDO
UPDATE auth.users 
SET instance_id = NULL 
WHERE id = 'c1d9c62f-f181-4a97-8fe7-d357d740f599' 
  AND instance_id = '00000000-0000-0000-0000-000000000000';

-- 4. CORRIGIR TOKENS VAZIOS (CONVERTER PARA NULL)
UPDATE auth.users 
SET 
    confirmation_token = NULLIF(confirmation_token, ''),
    recovery_token = NULLIF(recovery_token, ''),
    email_change_token_new = NULLIF(email_change_token_new, ''),
    email_change_token_current = NULLIF(email_change_token_current, ''),
    phone_change_token = NULLIF(phone_change_token, ''),
    reauthentication_token = NULLIF(reauthentication_token, '')
WHERE id = 'c1d9c62f-f181-4a97-8fe7-d357d740f599';

-- 5. GARANTIR QUE OS METADADOS ESTÃO CORRETOS
UPDATE auth.users 
SET raw_user_meta_data = jsonb_build_object(
    'plan_id', 'nexus-premium',
    'billing_type', 'yearly',
    'company_name', 'Caldo de cana zurita',
    'phone_number', '11915946212',
    'email_verified', true
)
WHERE id = 'c1d9c62f-f181-4a97-8fe7-d357d740f599';

-- 6. VERIFICAR CORREÇÕES APLICADAS
SELECT 
    'VERIFICAÇÃO PÓS-CORREÇÃO' as status,
    id,
    email,
    instance_id,
    raw_user_meta_data,
    CASE 
        WHEN raw_user_meta_data ? 'original_password_hash' THEN '❌ HASH AINDA PRESENTE'
        ELSE '✅ HASH REMOVIDO'
    END as security_status,
    CASE 
        WHEN instance_id = '00000000-0000-0000-0000-000000000000' THEN '❌ INSTANCE_ID INVÁLIDO'
        WHEN instance_id IS NULL THEN '✅ INSTANCE_ID CORRIGIDO'
        ELSE '✅ INSTANCE_ID VÁLIDO'
    END as instance_status
FROM auth.users 
WHERE id = 'c1d9c62f-f181-4a97-8fe7-d357d740f599';

-- 7. VERIFICAR PROFILE CORRESPONDENTE
SELECT 
    'PROFILE STATUS' as status,
    user_id,
    email,
    plan_name,
    plan_type,
    billing_type,
    status,
    subscription_status,
    created_at
FROM profiles 
WHERE user_id = 'c1d9c62f-f181-4a97-8fe7-d357d740f599';

-- 8. ATUALIZAR PROFILE SE NECESSÁRIO
UPDATE profiles 
SET 
    plan_name = 'nexus-premium',
    plan_type = 'nexus-premium',
    billing_type = 'yearly',
    status = 'active',
    subscription_status = 'active'
WHERE user_id = 'c1d9c62f-f181-4a97-8fe7-d357d740f599';

-- 9. VERIFICAÇÃO FINAL COMPLETA
SELECT 
    '=== RELATÓRIO FINAL ===' as titulo,
    u.id,
    u.email,
    u.instance_id,
    u.raw_user_meta_data,
    p.plan_name,
    p.status as profile_status,
    CASE 
        WHEN u.raw_user_meta_data ? 'original_password_hash' THEN '🔴 CRÍTICO: Hash ainda presente'
        ELSE '🟢 SEGURO: Hash removido'
    END as security_final_status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.id = 'c1d9c62f-f181-4a97-8fe7-d357d740f599';

-- 10. AUDITORIA - VERIFICAR OUTROS USUÁRIOS COM PROBLEMA SIMILAR
SELECT 
    'AUDITORIA: Outros usuários com hash nos metadados' as titulo,
    COUNT(*) as total_usuarios_com_hash,
    array_agg(email) as emails_afetados
FROM auth.users 
WHERE raw_user_meta_data ? 'original_password_hash'
  AND id != 'c1d9c62f-f181-4a97-8fe7-d357d740f599';

-- =====================================================
-- INSTRUÇÕES DE EXECUÇÃO:
-- =====================================================
-- 1. Acesse o Supabase Dashboard
-- 2. Vá para SQL Editor
-- 3. Execute cada seção separadamente
-- 4. Verifique os resultados de cada SELECT
-- 5. Confirme que o security_final_status mostra "🟢 SEGURO"
-- =====================================================

-- COMANDOS DE VERIFICAÇÃO RÁPIDA:
-- SELECT raw_user_meta_data ? 'original_password_hash' as tem_hash FROM auth.users WHERE id = 'c1d9c62f-f181-4a97-8fe7-d357d740f599';
-- Resultado esperado: false (não tem hash)