require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  console.log('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.log('VITE_SUPABASE_ANON_KEY:', !!supabaseKey);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey);
  process.exit(1);
}

const supabaseAnon = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function testRLSPermissions() {
  console.log('🔍 Testando permissões RLS com schema correto...');
  
  try {
    // 1. Testar SELECT anônimo em surveys (deve funcionar)
    console.log('\n1. Testando SELECT anônimo em surveys:');
    const { data: surveys, error: surveysError } = await supabaseAnon
      .from('surveys')
      .select('id, title, unique_link, status, max_responses, current_responses, user_id')
      .eq('status', 'active')
      .not('unique_link', 'is', null)
      .limit(3);
    
    if (surveysError) {
      console.error('❌ Erro ao buscar surveys:', surveysError.message);
    } else {
      console.log('✅ Surveys encontradas:', surveys?.length || 0);
      if (surveys && surveys.length > 0) {
        console.log('📋 Surveys ativas:', surveys.map(s => ({
          id: s.id,
          title: s.title,
          unique_link: s.unique_link,
          user_id: s.user_id
        })));
      }
    }

    // 2. Testar INSERT anônimo em responses (deve funcionar se RLS correto)
    if (surveys && surveys.length > 0) {
      const survey = surveys[0];
      console.log('\n2. Testando INSERT anônimo em responses:');
      
      const testResponse = {
        survey_id: survey.id,
        respondent_id: 'test-respondent-' + Date.now(),
        responses: { test_question: 'Teste de permissão RLS' },
        sentiment_score: 0.5,
        sentiment_category: 'neutral'
      };
      
      const { data: insertResult, error: insertError } = await supabaseAnon
        .from('responses')
        .insert(testResponse)
        .select();
      
      if (insertError) {
        console.error('❌ Erro ao inserir response (RLS bloqueou):', insertError.message);
        console.log('🔧 Código do erro:', insertError.code);
        console.log('🔧 Detalhes:', insertError.details);
      } else {
        console.log('✅ INSERT anônimo funcionou:', insertResult?.[0]?.id);
        
        // Limpar o teste
        if (insertResult && insertResult.length > 0) {
          await supabaseAdmin
            .from('responses')
            .delete()
            .eq('id', insertResult[0].id);
          console.log('🧹 Response de teste removida');
        }
      }
    }

    // 3. Testar SELECT de proprietário em responses
    console.log('\n3. Testando SELECT de proprietário em responses:');
    
    // Buscar um usuário que tenha surveys
    const { data: userWithSurveys, error: userError } = await supabaseAdmin
      .from('surveys')
      .select('user_id, id, title')
      .limit(1);
    
    if (userError) {
      console.error('❌ Erro ao buscar usuário com surveys:', userError.message);
    } else if (userWithSurveys && userWithSurveys.length > 0) {
      const survey = userWithSurveys[0];
      console.log('👤 Testando com survey do usuário:', survey.user_id);
      
      // Buscar responses desta survey usando service role (simula usuário autenticado)
      const { data: userResponses, error: userResponsesError } = await supabaseAdmin
        .from('responses')
        .select(`
          id, survey_id, respondent_id, responses, sentiment_score, created_at,
          surveys!inner(id, title, user_id)
        `)
        .eq('surveys.user_id', survey.user_id)
        .limit(5);
      
      if (userResponsesError) {
        console.error('❌ Erro ao buscar responses do proprietário:', userResponsesError.message);
        console.log('🔧 Código do erro:', userResponsesError.code);
        console.log('🔧 Detalhes:', userResponsesError.details);
      } else {
        console.log('✅ Responses do proprietário encontradas:', userResponses?.length || 0);
        if (userResponses && userResponses.length > 0) {
          console.log('📋 Primeira response:', {
            id: userResponses[0].id,
            survey_id: userResponses[0].survey_id,
            respondent_id: userResponses[0].respondent_id
          });
        }
      }
      
      // Testar SELECT direto como usuário anônimo (deve falhar para responses de outros)
      console.log('\n4. Testando SELECT anônimo em responses (deve falhar):');
      const { data: anonResponses, error: anonResponsesError } = await supabaseAnon
        .from('responses')
        .select('id, survey_id, respondent_id')
        .eq('survey_id', survey.id)
        .limit(1);
      
      if (anonResponsesError) {
        console.log('✅ SELECT anônimo em responses foi bloqueado (correto):', anonResponsesError.message);
      } else {
        console.log('⚠️ SELECT anônimo em responses funcionou (pode ser problema):', anonResponses?.length || 0);
      }
    }

    // 5. Verificar se conseguimos simular o erro do frontend
    console.log('\n5. Simulando cenário do frontend (usuário autenticado buscando suas responses):');
    
    // Buscar um usuário real
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ Erro ao buscar profiles:', profilesError.message);
    } else if (profiles && profiles.length > 0) {
      const profile = profiles[0];
      console.log('👤 Simulando usuário logado:', profile.email);
      
      // Criar cliente autenticado simulado (usando service role com filtro)
      const { data: ownSurveys, error: ownSurveysError } = await supabaseAdmin
        .from('surveys')
        .select('id, title, unique_link')
        .eq('user_id', profile.user_id)
        .limit(1);
      
      if (ownSurveysError) {
        console.error('❌ Erro ao buscar surveys próprias:', ownSurveysError.message);
      } else if (ownSurveys && ownSurveys.length > 0) {
        const ownSurvey = ownSurveys[0];
        console.log('📋 Survey própria encontrada:', ownSurvey.title);
        
        // Tentar buscar responses desta survey (simula o que o frontend faz)
        const { data: ownResponses, error: ownResponsesError } = await supabaseAdmin
          .from('responses')
          .select('*')
          .eq('survey_id', ownSurvey.id);
        
        if (ownResponsesError) {
          console.error('❌ Erro ao buscar responses próprias (mesmo erro do frontend):', ownResponsesError.message);
        } else {
          console.log('✅ Responses próprias encontradas:', ownResponses?.length || 0);
        }
      } else {
        console.log('ℹ️ Usuário não tem surveys próprias');
      }
    }

  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
  }
}

async function main() {
  console.log('🚀 Iniciando teste de permissões RLS (schema correto)...');
  await testRLSPermissions();
  console.log('\n✅ Teste concluído!');
  console.log('\n💡 Se houver erros PERMISSION_DENIED, execute o arquivo fix-rls-manual.sql no SQL Editor do Supabase');
}

main().catch(console.error);