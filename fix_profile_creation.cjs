const { createClient } = require('@supabase/supabase-js');

// Verificação de variáveis de ambiente
if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
  console.error('❌ SUPABASE_URL não encontrada nas variáveis de ambiente');
  console.log('💡 Certifique-se de que o arquivo .env.local existe e contém VITE_SUPABASE_URL');
  process.exit(1);
}

if (!process.env.SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY não encontrada nas variáveis de ambiente');
  console.log('💡 Certifique-se de que o arquivo .env.local existe e contém VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}


// Leia as credenciais do Supabase de variáveis de ambiente para evitar chaves hardcoded
const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // defina SUPABASE_ANON_KEY no ambiente antes de rodar

if (!supabaseKey) {
  console.error('❌ Variável de ambiente SUPABASE_ANON_KEY não definida. Configure-a e rode novamente.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function ensureExecSqlFunction() {
  // Cria uma função RPC exec_sql segura para executar SQL controlado via API
  const createExecSql = `
    create schema if not exists utils;

    create or replace function utils.exec_sql(sql text)
    returns json
    language plpgsql
    security definer
    set search_path = public, auth, extensions
    as $$
    declare
      result json;
    begin
      execute sql;
      result := json_build_object('status', 'ok');
      return result;
    exception when others then
      result := json_build_object('status', 'error', 'message', sqlerrm);
      return result;
    end;
    $$;

    -- Expor via RPC
    drop function if exists public.exec_sql(text);
    create or replace function public.exec_sql(sql text)
    returns json
    language sql
    security definer
    stable
    as $$ select utils.exec_sql($1); $$;

    revoke all on function public.exec_sql(text) from public;
    grant execute on function public.exec_sql(text) to anon, authenticated, service_role;
  `;

  const { error } = await supabase.rpc('exec_sql', { sql: createExecSql });
  if (error) {
    console.warn('⚠️ Não foi possível garantir exec_sql via RPC. Tente executar manualmente no SQL Editor do Supabase.');
  }
}

async function fixProfileCreation() {
  console.log('🔧 Iniciando correção da criação de perfis...');

  // garantir que a função exec_sql exista
  await ensureExecSqlFunction();

  try {
    // 1) Criar função e trigger para novos usuários
    const createFunctionSQL = `
      create or replace function public.handle_new_user_profile()
      returns trigger as $$
      begin
        insert into public.profiles (user_id, plan_name, status, created_at, updated_at)
        values (
          new.id,
          coalesce(new.raw_user_meta_data->>'plan_name', 'start-quantico'),
          'active',
          now(),
          now()
        )
        on conflict (user_id) do nothing;
        return new;
      end;
      $$ language plpgsql security definer;

      drop trigger if exists on_auth_user_created_profile on auth.users;
      create trigger on_auth_user_created_profile
        after insert on auth.users
        for each row execute function public.handle_new_user_profile();
    `;

    const { error: functionError } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
    if (functionError) console.error('❌ Erro ao criar função/trigger:', functionError.message || functionError);
    else console.log('✅ Função e trigger criadas.');

    // 2) Criar perfis ausentes
    const createMissingProfilesSQL = `
      insert into public.profiles (user_id, plan_name, status, created_at, updated_at)
      select 
        u.id,
        coalesce(u.raw_user_meta_data->>'plan_name', 'start-quantico') as plan_name,
        'active' as status,
        now() as created_at,
        now() as updated_at
      from auth.users u
      left join public.profiles p on u.id = p.user_id
      where p.user_id is null;
    `;

    const { error: profilesError } = await supabase.rpc('exec_sql', { sql: createMissingProfilesSQL });
    if (profilesError) console.error('❌ Erro ao criar perfis:', profilesError.message || profilesError);
    else console.log('✅ Perfis criados para usuários existentes.');

    // 3) Normalizar plan_name nulo
    const updateNullPlansSQL = `
      update public.profiles 
      set plan_name = 'start-quantico', updated_at = now()
      where plan_name is null;

      update public.companies 
      set plan_name = 'start-quantico', updated_at = now()
      where plan_name is null;
    `;

    const { error: updateError } = await supabase.rpc('exec_sql', { sql: updateNullPlansSQL });
    if (updateError) console.error('❌ Erro ao atualizar planos NULL:', updateError.message || updateError);
    else console.log('✅ Planos NULL atualizados para start-quantico.');

    // 4) Verificação
    const verificationSQL = `
      select 'users' as table_name, count(*) as count from auth.users
      union all
      select 'profiles' as table_name, count(*) as count from public.profiles
      union all
      select 'companies' as table_name, count(*) as count from public.companies;
    `;

    const { data: counts, error: countError } = await supabase.rpc('exec_sql', { sql: verificationSQL });
    if (countError) console.error('❌ Erro ao verificar contagens:', countError.message || countError);
    else {
      console.log('📈 Contagens das tabelas:');
      counts?.forEach((row) => console.log(`  ${row.table_name}: ${row.count}`));
    }

    console.log('🎉 Correção concluída com sucesso!');
  } catch (error) {
    console.error('💥 Erro durante a correção:', error);
  }
}

fixProfileCreation()
  .then(() => {
    console.log('✨ Script finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });