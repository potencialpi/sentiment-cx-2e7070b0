// Test script simples para debugar a Edge Function
console.log('🚀 Iniciando teste da Edge Function...');

try {
  // Teste básico de conectividade
  const response = await fetch('https://mjuxvppexydaeuoernxa.supabase.co/functions/v1/complete-account-creation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdXh2cHBleHlkYWV1b2VybnhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAzNjYsImV4cCI6MjA2OTAxNjM2Nn0.ECVfL7CLqJj4wSPBY7g5yu_zdfBqbUTCK18MAXHjeTg'
    },
    body: JSON.stringify({ sessionId: 'cs_test_987654321' })
  });

  console.log('📊 Status da resposta:', response.status);
  console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
  
  const responseText = await response.text();
  console.log('📝 Resposta completa:', responseText);
  
  if (!response.ok) {
    console.error('❌ Edge Function retornou erro:', response.status, response.statusText);
  } else {
    console.log('✅ Edge Function executada com sucesso!');
  }
  
} catch (error) {
  console.error('💥 Erro ao chamar Edge Function:', error.message);
}

console.log('🏁 Teste finalizado.');