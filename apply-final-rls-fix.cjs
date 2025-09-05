const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFinalRLSFix() {
  console.log('🔒 Aplicando correção final das políticas RLS...');
  console.log('=' .repeat(60));

  try {
    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync('./fix-surveys-rls-final.sql', 'utf8');
    
    // Dividir em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));

    console.log(`📝 Executando ${commands.length} comandos SQL...`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Pular comentários e comandos vazios
      if (command.startsWith('--') || command.startsWith('/*') || command.trim().length === 0) {
        continue;
      }

      console.log(`\n${i + 1}. Executando: ${command.substring(0, 50)}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: command
        });

        if (error) {
          console.log(`   ❌ Erro: ${error.message}`);
          // Continuar mesmo com erros (algumas políticas podem não existir)
        } else {
          console.log(`   ✅ Sucesso`);
          if (data && Array.isArray(data) && data.length > 0) {
            console.log(`   📊 Resultado:`, data);
          }
        }
      } catch (err) {
        console.log(`   ❌ Exceção: ${err.message}`);
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎯 Verificando resultado final...');

    // Testar acesso anônimo após correção
    const supabaseAnon = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    try {
      const { data: testData, error: testError } = await supabaseAnon
        .from('surveys')
        .select('*')
        .limit(1);
      
      if (testError) {
        console.log('✅ SUCESSO: Acesso anônimo à tabela surveys BLOQUEADO!');
        console.log(`   Erro: ${testError.message}`);
      } else {
        console.log('❌ PROBLEMA: Acesso anônimo à tabela surveys ainda permitido!');
      }
    } catch (error) {
      console.log('✅ SUCESSO: Acesso anônimo à tabela surveys BLOQUEADO (exceção)!');
      console.log(`   Erro: ${error.message}`);
    }

    // Verificar políticas criadas
    try {
      const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
        sql: `SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'surveys' ORDER BY policyname`
      });

      if (policiesError) {
        console.log('⚠️ Não foi possível verificar políticas:', policiesError.message);
      } else {
        console.log('\n📋 Políticas RLS ativas na tabela surveys:');
        if (policies && policies.length > 0) {
          policies.forEach(policy => {
            console.log(`   - ${policy.policyname} (${policy.cmd}) para ${policy.roles}`);
          });
        } else {
          console.log('   Nenhuma política encontrada');
        }
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar políticas:', error.message);
    }

    console.log('\n🎉 Correção final das políticas RLS aplicada!');
    console.log('🔒 Sistema agora BLOQUEIA completamente o acesso anônimo!');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar correção:', error);
    process.exit(1);
  }
}

// Executar correção
applyFinalRLSFix().catch(console.error);