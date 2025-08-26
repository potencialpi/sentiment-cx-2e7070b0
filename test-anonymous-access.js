import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

// Cliente anônimo (sem autenticação)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnonymousAccess() {
  console.log('🧪 Testando acesso anônimo às pesquisas...');
  
  try {
    // Teste 1: Tentar ler surveys como usuário anônimo
    console.log('\n📋 Teste 1: Leitura de surveys (anônimo)');
    const { data: surveys, error: surveysError } = await supabase
      .from('surveys')
      .select('id, title, description, unique_link, status')
      .limit(5);
    
    if (surveysError) {
      console.error('❌ Erro ao ler surveys:', surveysError.message);
    } else {
      console.log(`✅ Sucesso! Encontradas ${surveys.length} pesquisas`);
      if (surveys.length > 0) {
        console.log('📝 Primeira pesquisa:', {
          id: surveys[0].id,
          title: surveys[0].title,
          status: surveys[0].status
        });
      }
    }
    
    // Teste 2: Tentar ler questions como usuário anônimo
    console.log('\n❓ Teste 2: Leitura de questions (anônimo)');
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, survey_id, question_text, question_type')
      .limit(5);
    
    if (questionsError) {
      console.error('❌ Erro ao ler questions:', questionsError.message);
    } else {
      console.log(`✅ Sucesso! Encontradas ${questions.length} perguntas`);
      if (questions.length > 0) {
        console.log('📝 Primeira pergunta:', {
          id: questions[0].id,
          survey_id: questions[0].survey_id,
          question_text: questions[0].question_text?.substring(0, 50) + '...'
        });
      }
    }
    
    // Teste 3: Tentar inserir uma resposta como usuário anônimo
    console.log('\n💬 Teste 3: Inserção de response (anônimo)');
    
    if (surveys && surveys.length > 0 && questions && questions.length > 0) {
      const testResponse = {
        survey_id: surveys[0].id,
        question_id: questions[0].id,
        response_text: 'Resposta de teste anônima',
        response_type: 'text'
      };
      
      const { data: response, error: responseError } = await supabase
        .from('responses')
        .insert(testResponse)
        .select();
      
      if (responseError) {
        console.error('❌ Erro ao inserir response:', responseError.message);
      } else {
        console.log('✅ Sucesso! Response inserida:', response[0]?.id);
        
        // Limpar o teste - deletar a resposta criada
        await supabase
          .from('responses')
          .delete()
          .eq('id', response[0]?.id);
        console.log('🧹 Response de teste removida');
      }
    } else {
      console.log('⚠️  Pulando teste de inserção - sem dados para testar');
    }
    
    // Teste 4: Verificar se ainda não consegue acessar dados de outros usuários
    console.log('\n🔒 Teste 4: Verificação de isolamento (anônimo não deve ver dados privados)');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log('✅ Correto! Acesso negado a profiles:', profilesError.message);
    } else {
      console.log('⚠️  Atenção: Usuário anônimo conseguiu acessar profiles');
    }
    
    console.log('\n🎉 Teste de acesso anônimo concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
  }
}

// Executar o teste
testAnonymousAccess()
  .then(() => {
    console.log('\n✅ Todos os testes foram executados');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });