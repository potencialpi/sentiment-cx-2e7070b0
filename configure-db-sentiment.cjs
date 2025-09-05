#!/usr/bin/env node
/*
  Configuração automática do banco para a trigger de sentimento
  - Habilita a extensão pg_net (se disponível)
  - Define GUCs persistentes: app.supabase_url e app.supabase_service_role_key (se disponível)

  Requisitos:
  - .env.local (ou .env) com SUPABASE_URL/VITE_SUPABASE_URL e uma chave para autenticar (service ou anon)
  - Função RPC public.exec_sql criada (via bootstrap-exec-sql.sql)
*/

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
// Carrega .env.local e depois .env como fallback
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function mask(str, visible = 6) {
  if (!str) return '';
  const head = str.slice(0, visible);
  const tail = str.slice(-visible);
  return `${head}...${tail}`;
}

(async () => {
  console.log('== Configuração automática do banco (trigger de sentimento) ==');

  if (!supabaseUrl) {
    console.error('❌ SUPABASE_URL/VITE_SUPABASE_URL não definida(s) no ambiente (.env.local/.env)');
    process.exit(1);
  }

  const authKey = serviceRoleKey || anonKey;
  if (!authKey) {
    console.error('❌ Nenhuma chave encontrada para autenticar (SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY).');
    console.error('   Adicione-as no .env.local e tente novamente.');
    process.exit(1);
  }

  console.log('SUPABASE_URL:', supabaseUrl);
  console.log('Usando chave:', serviceRoleKey ? `service_role (${mask(serviceRoleKey)})` : `anon (${mask(anonKey)})`);

  const supabase = createClient(supabaseUrl, authKey);

  async function exec(sql) {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      throw new Error(`Erro ao executar SQL: ${error.message}`);
    }
    return data;
  }

  // 1) Tentar habilitar a extensão pg_net
  console.log('\n1) Habilitando extensão pg_net (se disponível)...');
  try {
    await exec(`DO $$
    BEGIN
      BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_net;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pg_net indisponível: %', SQLERRM;
      END;
    END $$;`);
    console.log('   ✓ pg_net verificada/habilitada (ou ignorada se indisponível).');
  } catch (e) {
    console.warn('   ⚠️ Não foi possível criar/verificar a pg_net. Prosseguindo assim mesmo. Motivo:', e.message);
  }

  // 2) Definir GUCs persistentes
  console.log('\n2) Definindo GUCs persistentes (ALTER DATABASE postgres SET app.*)...');
  const esc = (s) => String(s).replace(/'/g, "''");
  try {
    await exec(`ALTER DATABASE postgres SET app.supabase_url = '${esc(supabaseUrl)}';`);
    console.log('   ✓ app.supabase_url definida.');
  } catch (e) {
    console.error('   ❌ Falha ao definir app.supabase_url:', e.message);
  }

  if (serviceRoleKey) {
    try {
      await exec(`ALTER DATABASE postgres SET app.supabase_service_role_key = '${esc(serviceRoleKey)}';`);
      console.log('   ✓ app.supabase_service_role_key definida.');
    } catch (e) {
      console.error('   ❌ Falha ao definir app.supabase_service_role_key:', e.message);
    }
  } else {
    console.warn('   ⚠️ SUPABASE_SERVICE_ROLE_KEY ausente. Pulando definição de app.supabase_service_role_key.');
  }

  console.log('\nConcluído. Observações:');
  console.log('- As configurações persistentes entram em vigor para novas conexões.');
  console.log('- A trigger de sentimento usa current_setting(\'app.supabase_url\') e (\'app.supabase_service_role_key\').');
  console.log('- Se a service role não estiver configurada, a trigger vai ignorar a chamada da Edge Function (sem erros).');
})();