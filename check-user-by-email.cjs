// Quick lookup of a user by email using Supabase service role, plus profile info
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const { URL } = require('url');

function httpsGetJson(urlString, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const options = {
      method: 'GET',
      headers,
    };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data || '{}');
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            const err = new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json)}`);
            reject(err);
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: node check-user-by-email.cjs <email>');
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Erro: SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não estão definidos no ambiente (.env).');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  console.log(`🔎 Procurando usuário por email: ${email}`);

  let foundUser = null;

  // 1) Tentar via Admin API oficial do SDK (pagina por precaução)
  try {
    const perPage = 200;
    let page = 1;
    while (!foundUser) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const arr = (data && data.users) ? data.users : [];
      if (arr.length === 0) break; // sem mais páginas
      foundUser = arr.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
      if (foundUser) break;
      page += 1;
      if (page > 50) break; // proteção
    }
  } catch (e) {
    console.warn('⚠️ Falha ao usar admin.listUsers:', e.message || e);
  }

  // 2) Fallback: chamar diretamente o endpoint GoTrue Admin com filtro por email
  if (!foundUser) {
    try {
      const endpoint = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
      const headers = {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
      };
      const result = await httpsGetJson(endpoint, headers);
      if (Array.isArray(result) && result.length > 0) {
        // Alguns responses podem retornar array, outros objeto { users: [] }
        foundUser = result.find(u => (u.email || '').toLowerCase() === email.toLowerCase()) || result[0];
      } else if (result && result.users && Array.isArray(result.users)) {
        foundUser = result.users.find(u => (u.email || '').toLowerCase() === email.toLowerCase()) || result.users[0];
      }
    } catch (e) {
      console.warn('⚠️ Falha no fallback via GoTrue Admin:', e.message || e);
    }
  }

  // 3) Fallback adicional: procurar perfil por email e tentar recuperar o usuário pelo ID do perfil
  let profileFromEmailFallback = null;
  if (!foundUser) {
    try {
      const { data: profByEmail, error: profByEmailErr } = await supabase
        .from('profiles')
        .select('user_id, plan_name, subscription_status, stripe_customer_id, created_at, email')
        .eq('email', email)
        .maybeSingle();
      if (profByEmailErr) {
        console.warn('⚠️ Erro consultando profiles por email:', profByEmailErr.message || profByEmailErr);
      } else if (profByEmail && profByEmail.user_id) {
        profileFromEmailFallback = profByEmail;
        try {
          const { data: userById, error: userByIdErr } = await supabase.auth.admin.getUserById(profByEmail.user_id);
          if (userByIdErr) {
            console.warn('⚠️ Falha ao buscar usuário por ID:', userByIdErr.message || userByIdErr);
          } else if (userById && (userById.user || userById.id)) {
            // SDK v2: retorna { user }, mas alguns retornos podem vir flat
            foundUser = userById.user || userById;
          }
        } catch (e) {
          console.warn('⚠️ Exceção ao buscar usuário por ID:', e.message || e);
        }
      }
    } catch (e) {
      console.warn('⚠️ Exceção consultando profiles por email:', e.message || e);
    }
  }

  if (!foundUser && !profileFromEmailFallback) {
    console.log('❌ Usuário não encontrado.');
    process.exit(2);
  } else if (!foundUser && profileFromEmailFallback) {
    console.log('ℹ️ Usuário no Auth não pôde ser recuperado (Admin API possivelmente indisponível), mas encontramos um perfil correspondente.');
    foundUser = { id: profileFromEmailFallback.user_id, email, created_at: null, email_confirmed_at: null };
  }

  console.log('✅ Usuário encontrado:');
  console.log(`   ID: ${foundUser.id}`);
  console.log(`   Email: ${foundUser.email}`);
  console.log(`   Confirmado: ${foundUser.email_confirmed_at ? 'Sim' : 'Não'}`);
  console.log(`   Criado em: ${foundUser.created_at ? new Date(foundUser.created_at).toLocaleString() : 'N/A'}`);

  // Buscar profile correspondente
  let profile = null; let profErr = null;
  try {
    const res = await supabase
      .from('profiles')
      .select('user_id, plan_name, subscription_status, stripe_customer_id, created_at')
      .eq('user_id', foundUser.id)
      .maybeSingle();
    profile = res.data; profErr = res.error || null;
  } catch (e) {
    profErr = e;
  }

  if (profErr) {
    console.error('⚠️ Erro consultando profiles:', profErr.message || profErr);
  }

  if (!profile && profileFromEmailFallback) {
    profile = profileFromEmailFallback;
  }

  if (profile) {
    console.log('🧾 Perfil:');
    console.log(`   Plano: ${profile.plan_name || 'N/A'}`);
    console.log(`   Status: ${profile.subscription_status || 'N/A'}`);
    console.log(`   Stripe Customer: ${profile.stripe_customer_id || 'N/A'}`);
    console.log(`   Criado em: ${profile.created_at ? new Date(profile.created_at).toLocaleString() : 'N/A'}`);
  } else {
    console.log('⚠️ Perfil não encontrado para este usuário.');
  }
}

main().catch((e) => {
  console.error('Erro inesperado:', e.message);
  process.exit(1);
});