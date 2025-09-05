#!/usr/bin/env node

// =====================================================
// APLICAR CORREÇÃO ESPECÍFICA: REMOVER ACESSO ANÔNIMO DA TABELA SURVEYS
// =====================================================

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuração do cliente Supabase com service role
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Erro: Variáveis de ambiente não configuradas');
    console.error('   VITE_SUPABASE_URL:', !!supabaseUrl);
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function executeSql(sql, description) {
    console.log(`\n🔧 ${description}...`);
    try {
        const { data, error } = await supabase.rpc('exec', { sql });
        if (error) {
            console.error(`❌ Erro: ${error.message}`);
            return false;
        }
        console.log(`✅ ${description} - Sucesso`);
        if (data && data.length > 0) {
            console.log('📊 Resultado:', data);
        }
        return true;
    } catch (err) {
        console.error(`❌ Erro: ${err.message}`);
        return false;
    }
}

async function applySurveysFix() {
    console.log('🔒 APLICANDO CORREÇÃO ESPECÍFICA: REMOVER ACESSO ANÔNIMO DA TABELA SURVEYS');
    console.log('=' .repeat(80));

    let successCount = 0;
    let totalOperations = 0;

    // 1. Verificar estado atual
    totalOperations++;
    const checkCurrentState = `
        SELECT 
            schemaname,
            tablename,
            rowsecurity as rls_enabled,
            CASE 
                WHEN rowsecurity THEN 'RLS Habilitado'
                ELSE 'RLS Desabilitado'
            END as status
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'surveys';
    `;
    if (await executeSql(checkCurrentState, 'Verificando estado atual da tabela surveys')) {
        successCount++;
    }

    // 2. Revogar todos os privilégios anônimos
    totalOperations++;
    const revokeAnonPrivileges = `
        REVOKE ALL PRIVILEGES ON TABLE public.surveys FROM anon;
        REVOKE SELECT ON TABLE public.surveys FROM anon;
        REVOKE INSERT ON TABLE public.surveys FROM anon;
        REVOKE UPDATE ON TABLE public.surveys FROM anon;
        REVOKE DELETE ON TABLE public.surveys FROM anon;
        REVOKE REFERENCES ON TABLE public.surveys FROM anon;
        REVOKE TRIGGER ON TABLE public.surveys FROM anon;
        REVOKE TRUNCATE ON TABLE public.surveys FROM anon;
    `;
    if (await executeSql(revokeAnonPrivileges, 'Revogando todos os privilégios anônimos da tabela surveys')) {
        successCount++;
    }

    // 3. Habilitar RLS
    totalOperations++;
    const enableRLS = `ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;`;
    if (await executeSql(enableRLS, 'Habilitando RLS na tabela surveys')) {
        successCount++;
    }

    // 4. Remover todas as políticas existentes
    totalOperations++;
    const dropPolicies = `
        DROP POLICY IF EXISTS "Users can view own surveys" ON public.surveys;
        DROP POLICY IF EXISTS "Users can insert own surveys" ON public.surveys;
        DROP POLICY IF EXISTS "Users can update own surveys" ON public.surveys;
        DROP POLICY IF EXISTS "Users can delete own surveys" ON public.surveys;
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.surveys;
        DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.surveys;
        DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.surveys;
        DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.surveys;
        DROP POLICY IF EXISTS "Authenticated users can view own surveys" ON public.surveys;
        DROP POLICY IF EXISTS "Authenticated users can insert surveys" ON public.surveys;
        DROP POLICY IF EXISTS "Authenticated users can update own surveys" ON public.surveys;
        DROP POLICY IF EXISTS "Authenticated users can delete own surveys" ON public.surveys;
        DROP POLICY IF EXISTS "auth_users_select_own_surveys" ON public.surveys;
        DROP POLICY IF EXISTS "auth_users_insert_surveys" ON public.surveys;
        DROP POLICY IF EXISTS "auth_users_update_own_surveys" ON public.surveys;
        DROP POLICY IF EXISTS "auth_users_delete_own_surveys" ON public.surveys;
        DROP POLICY IF EXISTS "authenticated_users_select_own_surveys" ON public.surveys;
        DROP POLICY IF EXISTS "authenticated_users_insert_surveys" ON public.surveys;
        DROP POLICY IF EXISTS "authenticated_users_update_own_surveys" ON public.surveys;
        DROP POLICY IF EXISTS "authenticated_users_delete_own_surveys" ON public.surveys;
    `;
    if (await executeSql(dropPolicies, 'Removendo todas as políticas existentes')) {
        successCount++;
    }

    // 5. Criar políticas apenas para usuários autenticados
    totalOperations++;
    const createAuthPolicies = `
        -- Política para SELECT
        CREATE POLICY "authenticated_users_select_own_surveys" ON public.surveys
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);

        -- Política para INSERT
        CREATE POLICY "authenticated_users_insert_surveys" ON public.surveys
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);

        -- Política para UPDATE
        CREATE POLICY "authenticated_users_update_own_surveys" ON public.surveys
            FOR UPDATE TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        -- Política para DELETE
        CREATE POLICY "authenticated_users_delete_own_surveys" ON public.surveys
            FOR DELETE TO authenticated
            USING (auth.uid() = user_id);
    `;
    if (await executeSql(createAuthPolicies, 'Criando políticas para usuários autenticados')) {
        successCount++;
    }

    // 6. Verificar configuração final
    totalOperations++;
    const finalCheck = `
        SELECT 
            'RLS Status' as check_type,
            schemaname,
            tablename,
            rowsecurity as rls_enabled
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'surveys'
        
        UNION ALL
        
        SELECT 
            'Policies' as check_type,
            schemaname,
            policyname as tablename,
            CASE WHEN roles = '{authenticated}' THEN true ELSE false END as rls_enabled
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename = 'surveys'
        ORDER BY check_type, tablename;
    `;
    if (await executeSql(finalCheck, 'Verificando configuração final')) {
        successCount++;
    }

    // Relatório final
    console.log('\n' + '=' .repeat(80));
    console.log('📊 RELATÓRIO FINAL DA CORREÇÃO');
    console.log('=' .repeat(80));
    console.log(`✅ Operações bem-sucedidas: ${successCount}/${totalOperations}`);
    
    if (successCount === totalOperations) {
        console.log('🎉 Correção aplicada com sucesso!');
        console.log('\n🔧 Próximos passos:');
        console.log('   1. Execute: node test-complete-security.cjs');
        console.log('   2. Confirme que SELECT anônimo foi bloqueado na tabela surveys');
    } else {
        console.log('⚠️  Algumas operações falharam.');
        console.log('\n🔧 Ações recomendadas:');
        console.log('   1. Execute manualmente o arquivo: fix-surveys-anon-access.sql');
        console.log('   2. Verifique os logs de erro acima');
        console.log('   3. Execute: node test-complete-security.cjs');
    }
    
    console.log('\n✅ Script de correção concluído');
}

// Executar correção
applySurveysFix().catch(console.error);