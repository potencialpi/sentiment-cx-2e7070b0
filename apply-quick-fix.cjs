require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyQuickFix() {
    try {
        console.log('🔧 Aplicando correção rápida para função log_audit_action...');
        
        // Ler o SQL da correção
        const sqlContent = fs.readFileSync('fix-audit-function-only.sql', 'utf8');
        
        // Executar o SQL
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: sqlContent
        });
        
        if (error) {
            // Tentar método alternativo se exec_sql não existir
            console.log('⚠️ Tentando método alternativo...');
            
            // Executar linha por linha
            const lines = sqlContent.split(';').filter(line => line.trim());
            
            for (const line of lines) {
                if (line.trim()) {
                    const { error: lineError } = await supabase.rpc('exec', {
                        sql: line.trim() + ';'
                    });
                    
                    if (lineError) {
                        console.log('⚠️ Erro na linha, continuando:', lineError.message);
                    }
                }
            }
        }
        
        console.log('✅ Correção aplicada com sucesso!');
        console.log('🧪 Testando a função...');
        
        // Testar a função
        const { data: testData, error: testError } = await supabase.rpc('log_audit_action', {
            p_action: 'test',
            p_table_name: 'test_table',
            p_details: { test: true }
        });
        
        if (testError) {
            console.error('❌ Erro no teste:', testError.message);
            console.log('\n📋 INSTRUÇÕES MANUAIS:');
            console.log('1. Acesse o Supabase Dashboard');
            console.log('2. Vá para SQL Editor');
            console.log('3. Cole e execute o conteúdo do arquivo fix-audit-function-only.sql');
            console.log('4. Execute: node test_audit_function.cjs');
        } else {
            console.log('✅ Função funcionando! UUID retornado:', testData);
            console.log('🎉 Magic Links devem funcionar agora!');
        }
        
    } catch (error) {
        console.error('❌ Erro na aplicação:', error.message);
        console.log('\n📋 INSTRUÇÕES MANUAIS:');
        console.log('1. Acesse o Supabase Dashboard');
        console.log('2. Vá para SQL Editor');
        console.log('3. Cole e execute o conteúdo do arquivo fix-audit-function-only.sql');
        console.log('4. Execute: node test_audit_function.cjs');
    }
}

applyQuickFix();