import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Permitir CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      },
    });
  }

  try {
    console.log('🧪 Testando variáveis de ambiente na Edge Function...');
    
    // Verificar todas as variáveis de ambiente relevantes
    const envVars = {
      SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
      SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY'),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      STRIPE_SECRET_KEY: Deno.env.get('STRIPE_SECRET_KEY'),
      STRIPE_PUBLISHABLE_KEY: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
    };
    
    console.log('📋 Variáveis de ambiente encontradas:');
    for (const [key, value] of Object.entries(envVars)) {
      if (value) {
        console.log(`   ${key}: ✅ Configurada (${value.substring(0, 10)}...)`);
      } else {
        console.log(`   ${key}: ❌ Não encontrada`);
      }
    }
    
    // Teste específico do Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (stripeKey) {
      console.log('🔑 STRIPE_SECRET_KEY encontrada!');
      console.log('   Começa com:', stripeKey.substring(0, 7));
      console.log('   Comprimento:', stripeKey.length);
      
      // Tentar importar e inicializar o Stripe
      try {
        const { default: Stripe } = await import('https://esm.sh/stripe@15.12.0?target=deno');
        console.log('📦 Stripe importado com sucesso');
        
        const stripe = new Stripe(stripeKey, {
          apiVersion: '2023-10-16',
        });
        console.log('✅ Stripe inicializado com sucesso');
        
        // Teste simples - listar produtos
        try {
          const products = await stripe.products.list({ limit: 1 });
          console.log('🎉 Conexão com Stripe funcionando! Produtos encontrados:', products.data.length);
        } catch (stripeError) {
          console.error('❌ Erro ao conectar com Stripe:', stripeError.message);
        }
        
      } catch (importError) {
        console.error('❌ Erro ao importar Stripe:', importError.message);
      }
    } else {
      console.error('❌ STRIPE_SECRET_KEY não encontrada!');
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        environment_variables: Object.fromEntries(
          Object.entries(envVars).map(([key, value]) => [
            key,
            value ? `${value.substring(0, 10)}...` : 'NOT_FOUND'
          ])
        ),
        stripe_key_available: !!stripeKey,
        stripe_key_prefix: stripeKey ? stripeKey.substring(0, 7) : null,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
    
  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Erro interno da função',
        message: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});