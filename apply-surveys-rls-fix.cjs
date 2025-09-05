const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applySurveysRLSFix() {
  console.log('🔧 Aplicando correção urgente das políticas RLS para surveys...');
  
  try {
    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync('fix-surveys-rls-urgent.sql', 'utf8');
    
    // Dividir em comandos individuais (separados por ';')
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Executando ${commands.length} comandos SQL...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Pular comentários e comandos vazios
      if (command.startsWith('--') || command.length < 10) {
        continue;
      }
      
      console.log(`\n${i + 1}. Executando: ${command.substring(0, 50)}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: command
      });
      
      if (error) {
        console.error(`❌ Erro no comando ${i + 1}:`, error);
        // Continuar mesmo com erro, pois alguns comandos podem falhar se a política não existir
      } else {
        console.log(`✅ Comando ${i + 1} executado com sucesso`);
        if (data && typeof data === 'object' && data.status !== 'ok') {
          console.log('📋 Resultado:', data);
        }
      }
      
      // Pequena pausa entre comandos
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n🎉 Correção das políticas RLS aplicada!');
    
    // Verificar se as políticas foram criadas
    console.log('\n🔍 Verificando políticas criadas...');
    const { data: verification, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          policyname,
          cmd,
          permissive
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'surveys'
        ORDER BY policyname;
      `
    });
    
    if (verifyError) {
      console.error('❌ Erro ao verificar políticas:', verifyError);
    } else {
      console.log('📋 Políticas verificadas:', verification);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

applySurveysRLSFix();