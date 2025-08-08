// Script para deletar TODOS os usuários do Supabase
// ATENÇÃO: Este script irá deletar permanentemente todos os dados!
// Use apenas em ambiente de desenvolvimento/teste

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mjuxvppexydaeuoernxa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deleteAllUsers() {
  console.log('🗑️  Iniciando processo de limpeza de usuários...');
  console.log('⚠️  ATENÇÃO: Todos os usuários e dados relacionados serão deletados!');
  
  try {
    // Primeiro, vamos ver quantos usuários existem
    console.log('\n1. Verificando usuários existentes...');
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    
    if (fetchError) {
      console.log('❌ Erro ao buscar usuários:', fetchError.message);
      console.log('\n🔧 Tentando método alternativo via RPC...');
      
      // Método alternativo usando RPC para deletar via SQL
      const { data, error: rpcError } = await supabase.rpc('delete_all_auth_users');
      
      if (rpcError) {
        console.log('❌ Erro no RPC:', rpcError.message);
        console.log('\n📝 Execute manualmente no SQL Editor do Supabase:');
        console.log('DELETE FROM auth.users;');
        return;
      }
      
      console.log('✅ Usuários deletados via RPC!');
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('✅ Nenhum usuário encontrado. Base já está limpa!');
      return;
    }
    
    console.log(`📊 Encontrados ${users.length} usuários para deletar`);
    
    // Deletar cada usuário individualmente
    console.log('\n2. Deletando usuários...');
    let deletedCount = 0;
    
    for (const user of users) {
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.log(`❌ Erro ao deletar usuário ${user.email}:`, deleteError.message);
        } else {
          deletedCount++;
          console.log(`✅ Usuário deletado: ${user.email}`);
        }
      } catch (err) {
        console.log(`❌ Erro inesperado ao deletar ${user.email}:`, err.message);
      }
    }
    
    console.log(`\n🎉 Processo concluído! ${deletedCount}/${users.length} usuários deletados.`);
    
    // Verificar se a limpeza foi bem-sucedida
    console.log('\n3. Verificando limpeza...');
    await verifyCleanup();
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
    console.log('\n📝 Execute manualmente no SQL Editor do Supabase:');
    console.log('DELETE FROM auth.users;');
  }
}

async function verifyCleanup() {
  try {
    const { data: remainingUsers } = await supabase.auth.admin.listUsers();
    const userCount = remainingUsers?.length || 0;
    
    console.log(`👥 Usuários restantes: ${userCount}`);
    
    // Verificar tabelas relacionadas
    const { data: profiles } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { data: surveys } = await supabase.from('surveys').select('*', { count: 'exact', head: true });
    const { data: responses } = await supabase.from('responses').select('*', { count: 'exact', head: true });
    
    console.log(`📋 Perfis restantes: ${profiles?.length || 0}`);
    console.log(`📊 Pesquisas restantes: ${surveys?.length || 0}`);
    console.log(`📝 Respostas restantes: ${responses?.length || 0}`);
    
    if (userCount === 0) {
      console.log('\n🎉 Limpeza completa! Todos os usuários foram removidos.');
    } else {
      console.log('\n⚠️  Alguns usuários podem não ter sido removidos. Verifique manualmente.');
    }
    
  } catch (error) {
    console.log('❌ Erro ao verificar limpeza:', error.message);
  }
}

// Executar o script
deleteAllUsers();