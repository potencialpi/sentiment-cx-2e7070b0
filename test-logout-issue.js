import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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


// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: {
      getItem: (key) => null,
      setItem: (key, value) => {},
      removeItem: (key) => {}
    },
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function testLogoutIssue() {
  console.log('🔍 Diagnóstico do Problema de Logout\n');
  
  try {
    // 1. Test basic connection
    console.log('1. Testando conexão básica com Supabase...');
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('❌ Erro de conexão:', error.message);
      if (error.message.includes('JWT')) {
        console.log('💡 Possível problema: Token JWT inválido ou expirado');
      }
      if (error.message.includes('CORS')) {
        console.log('💡 Possível problema: Configuração CORS no Supabase');
      }
    } else {
      console.log('✅ Conexão básica funcionando');
    }
    
    // 2. Test auth endpoint directly
    console.log('\n2. Testando endpoint de autenticação...');
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Status da resposta:', response.status);
      if (response.ok) {
        console.log('✅ Endpoint de auth acessível');
      } else {
        console.log('❌ Endpoint de auth com problema:', response.statusText);
      }
    } catch (fetchError) {
      console.log('❌ Erro ao acessar endpoint de auth:', fetchError.message);
    }
    
    // 3. Test logout endpoint specifically
    console.log('\n3. Testando endpoint de logout...');
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=local`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Status da resposta logout:', response.status);
      if (response.ok) {
        console.log('✅ Endpoint de logout acessível');
      } else {
        console.log('❌ Endpoint de logout com problema:', response.statusText);
      }
    } catch (fetchError) {
      console.log('❌ Erro ao acessar endpoint de logout:', fetchError.message);
    }
    
    // 4. Test signOut method
    console.log('\n4. Testando método signOut do Supabase...');
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      
      if (signOutError) {
        console.log('❌ Erro no signOut:', signOutError.message);
      } else {
        console.log('✅ SignOut executado sem erro');
      }
    } catch (signOutError) {
      console.log('❌ Exceção no signOut:', signOutError.message);
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
  }
  
  console.log('\n📋 POSSÍVEIS CAUSAS DO ERRO ERR_ABORTED:');
  console.log('1. 🌐 Problema de conectividade de rede');
  console.log('2. 🔒 Configuração CORS no projeto Supabase');
  console.log('3. ⏸️  Projeto Supabase pausado ou indisponível');
  console.log('4. 🔑 Token de autenticação inválido ou expirado');
  console.log('5. 🚫 Firewall ou proxy bloqueando a requisição');
  console.log('6. 📱 Problema específico do navegador/cache');
  
  console.log('\n🔧 SOLUÇÕES RECOMENDADAS:');
  console.log('1. Verificar se o projeto Supabase está ativo no dashboard');
  console.log('2. Limpar cache do navegador e cookies');
  console.log('3. Testar em modo incógnito/privado');
  console.log('4. Verificar configurações de CORS no Supabase');
  console.log('5. Testar com diferentes navegadores');
  console.log('6. Verificar logs do Supabase no dashboard');
}

testLogoutIssue();