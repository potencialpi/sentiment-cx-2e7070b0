// Script para atualizar o frontend e garantir autenticação obrigatória
const fs = require('fs');
const path = require('path');

console.log('🔒 Atualizando frontend para eliminar acesso anônimo...');

// 1. Atualizar SurveyResponse.tsx para exigir autenticação
const surveyResponsePath = path.join(__dirname, 'src', 'pages', 'SurveyResponse.tsx');
let surveyResponseContent = fs.readFileSync(surveyResponsePath, 'utf8');

// Adicionar verificação de autenticação no início do componente
const authCheckCode = `
  // Verificar autenticação obrigatória
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.error('❌ Acesso negado: Usuário não autenticado');
        toast({
          title: "Acesso Negado",
          description: "Você precisa estar logado para acessar esta pesquisa.",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }
      
      console.log('✅ Usuário autenticado:', session.user.email);
    };
    
    checkAuth();
  }, [navigate, toast]);
`;

// Inserir a verificação de autenticação após as declarações de estado
const stateDeclarationEnd = 'const { toast } = useToast();';
const insertIndex = surveyResponseContent.indexOf(stateDeclarationEnd) + stateDeclarationEnd.length;

if (insertIndex > stateDeclarationEnd.length - 1) {
  surveyResponseContent = 
    surveyResponseContent.slice(0, insertIndex) + 
    authCheckCode + 
    surveyResponseContent.slice(insertIndex);
  
  fs.writeFileSync(surveyResponsePath, surveyResponseContent);
  console.log('✅ SurveyResponse.tsx atualizado com verificação de autenticação');
} else {
  console.log('⚠️ Não foi possível localizar o ponto de inserção em SurveyResponse.tsx');
}

// 2. Atualizar cliente Supabase para sempre incluir token de autenticação
const clientPath = path.join(__dirname, 'src', 'integrations', 'supabase', 'client.ts');
let clientContent = fs.readFileSync(clientPath, 'utf8');

// Adicionar interceptador para Edge Functions
const interceptorCode = `
// Interceptador para garantir autenticação em Edge Functions
supabase.functions.setAuth = async (token?: string) => {
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado');
    }
    token = session.access_token;
  }
  return token;
};

// Sobrescrever invoke para sempre incluir autenticação
const originalInvoke = supabase.functions.invoke;
supabase.functions.invoke = async (functionName: string, options: any = {}) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Acesso negado: Usuário não autenticado');
    }
    
    // Garantir que o token de autenticação seja sempre incluído
    const headers = {
      'Authorization': \`Bearer \${session.access_token}\`,
      ...options.headers
    };
    
    return originalInvoke.call(supabase.functions, functionName, {
      ...options,
      headers
    });
  } catch (error) {
    console.error('❌ Erro na chamada da Edge Function:', error);
    throw error;
  }
};
`;

// Adicionar o interceptador antes da exportação
const exportIndex = clientContent.indexOf('export const supabase');
if (exportIndex !== -1) {
  clientContent = 
    clientContent.slice(0, exportIndex) + 
    interceptorCode + 
    '\n' +
    clientContent.slice(exportIndex);
  
  fs.writeFileSync(clientPath, clientContent);
  console.log('✅ Cliente Supabase atualizado com interceptador de autenticação');
} else {
  console.log('⚠️ Não foi possível localizar o ponto de inserção no cliente Supabase');
}

// 3. Criar componente de proteção de rotas
const protectedRouteContent = `import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          console.error('❌ Usuário não autenticado');
          setIsAuthenticated(false);
          toast({
            title: "Acesso Negado",
            description: "Você precisa estar logado para acessar esta página.",
            variant: "destructive",
          });
          return;
        }
        
        console.log('✅ Usuário autenticado:', session.user.email);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
      } else if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
`;

const protectedRoutePath = path.join(__dirname, 'src', 'components', 'ProtectedRoute.tsx');
fs.writeFileSync(protectedRoutePath, protectedRouteContent);
console.log('✅ Componente ProtectedRoute criado');

// 4. Atualizar variáveis de ambiente
const envPath = path.join(__dirname, '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Adicionar ou atualizar a flag para usar autenticação obrigatória
if (!envContent.includes('VITE_REQUIRE_AUTH=')) {
  envContent += '\n# Exigir autenticação para todas as operações\nVITE_REQUIRE_AUTH=true\n';
}

// Manter a flag do banco de dados
if (!envContent.includes('VITE_USE_DB_SENTIMENT=')) {
  envContent += '\n# Usar trigger do banco para análise de sentimento\nVITE_USE_DB_SENTIMENT=true\n';
}

fs.writeFileSync(envPath, envContent);
console.log('✅ Variáveis de ambiente atualizadas');

console.log('\n🎉 Frontend atualizado com sucesso!');
console.log('\n📋 Resumo das alterações:');
console.log('  ✅ SurveyResponse.tsx: Verificação de autenticação obrigatória');
console.log('  ✅ Cliente Supabase: Interceptador para Edge Functions');
console.log('  ✅ ProtectedRoute: Componente de proteção de rotas');
console.log('  ✅ Variáveis de ambiente: Flags de segurança');
console.log('\n⚠️ Próximos passos:');
console.log('  1. Implementar rotas de login/registro');
console.log('  2. Proteger todas as rotas sensíveis com ProtectedRoute');
console.log('  3. Testar o fluxo completo de autenticação');