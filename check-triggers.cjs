require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTriggers() {
  try {
    // Verificar se existem triggers relacionados ao handle_new_user
    const { data, error } = await supabase
      .rpc('sql', {
        query: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE '%handle_new_user%';`
      });
    
    if (error) {
      console.log('Erro ao verificar triggers:', error);
      return;
    }
    
    console.log('Triggers encontrados:', JSON.stringify(data, null, 2));
    
    // Verificar se as funções existem
    const { data: functions, error: funcError } = await supabase
      .rpc('sql', {
        query: `SELECT * FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%handle_new_user%';`
      });
    
    if (funcError) {
      console.log('Erro ao verificar funções:', funcError);
      return;
    }
    
    console.log('Funções encontradas:', JSON.stringify(functions, null, 2));
    
  } catch (err) {
    console.error('Erro geral:', err);
  }
}

checkTriggers();