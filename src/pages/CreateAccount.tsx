import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { getPlanAdminRoute, getUserPlan } from '@/lib/planUtils';
import { validateUserPlanAccess, handlePlanError } from '@/lib/planValidation';
import StripeCheckout from '@/components/StripeCheckout';

const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;

const createAccountSchema = z.object({
  email: z.string().email('E-mail inválido'),
  companyName: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(passwordRegex, 'Senha deve conter pelo menos 1 número e 1 caractere especial'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
});

type CreateAccountForm = z.infer<typeof createAccountSchema>;

const plans = [
  { id: 'start-quantico', name: 'Start Quântico', monthlyPrice: 349, yearlyPrice: 3499, monthlyDisplay: 'R$ 349/mês', yearlyDisplay: 'R$ 3.499/ano' },
  { id: 'vortex-neural', name: 'Vortex Neural', monthlyPrice: 649, yearlyPrice: 6199, monthlyDisplay: 'R$ 649/mês', yearlyDisplay: 'R$ 6.199/ano' },
  { id: 'nexus-infinito', name: 'Nexus Infinito', monthlyPrice: 1249, yearlyPrice: 11899, monthlyDisplay: 'R$ 1.249/mês', yearlyDisplay: 'R$ 11.899/ano' }
];

const CreateAccount = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get('session_id');
  
  const [isLoading, setIsLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [userCredentials, setUserCredentials] = useState<{email: string; planId: string} | null>(null);

  const redirectToCorrectAdminPage = async (userId: string) => {
    try {
      // Usar validação robusta de plano
      const planValidation = await validateUserPlanAccess(userId);
      const planCode = planValidation.planCode;

      console.log('CreateAccount - Plano encontrado:', planCode);
      
      // Redireciona para a página administrativa correta baseada no plano
      const adminRoute = getPlanAdminRoute(planCode);
      console.log('CreateAccount - Redirecionando para:', adminRoute);
      navigate(adminRoute);
    } catch (error) {
      handlePlanError(error, 'redirectToCorrectAdminPage');
      console.error('Erro ao buscar plano do usuário:', error);
      // Em caso de erro, redireciona para o dashboard padrão
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    if (sessionId) {
      // Se há session_id, completar a criação da conta
      completeAccountCreation();
    } else {
      // Se não há session_id, redirecionar para checkout
      navigate('/checkout-guest');
    }
  }, [sessionId, navigate]);

  const completeAccountCreation = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('complete-account-creation', {
        body: { sessionId }
      });

      if (error) {
        console.error('Erro complete-account-creation:', error);
        toast({
          title: 'Erro na criação da conta',
          description: 'Não foi possível completar a criação da conta. Tente novamente ou contate o suporte.',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      if (!data?.success) {
        console.warn('Criação de conta não concluída:', data);
        toast({
          title: 'Erro na criação da conta',
          description: data?.error || 'Não foi possível completar a criação da conta.',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      // Sucesso
      setUserCredentials({
        email: data.email,
        planId: data.planId
      });
      setAccountCreated(true);
      
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Você já pode fazer login e acessar sua conta.'
      });
    } catch (error) {
      console.error('Erro ao completar criação da conta:', error);
      toast({
        title: 'Erro na criação da conta',
        description: 'Não foi possível completar a criação da conta. Entre em contato com o suporte.',
        variant: 'destructive'
      });
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="account-page-container">
        <Header />
        <div className="flex items-center justify-center py-12 px-6">
          <Card className="account-card-enhanced w-full max-w-md">
            <CardContent className="text-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Criando sua conta...</h2>
              <p className="text-gray-600">
                Aguarde enquanto finalizamos o processo de criação da sua conta.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (accountCreated && userCredentials) {
    return (
      <div className="min-h-screen bg-brand-bg-gray">
        <Header />
        <div className="flex items-center justify-center py-12 px-6">
          <Card className="account-card-enhanced w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle className="text-2xl font-bold text-brand-dark-blue">
                Conta Criada com Sucesso!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Detalhes da conta:</p>
                <p className="font-medium">{userCredentials.email}</p>
                <p className="text-sm text-gray-600">Plano: {userCredentials.planId}</p>
              </div>
              
              <p className="text-gray-600">
                Sua conta foi criada e o pagamento foi confirmado. Agora você pode fazer login e começar a usar a plataforma.
              </p>
              
              <Button 
                onClick={handleGoToLogin}
                className="w-full bg-brand-green hover:bg-brand-green/90"
                size="lg"
              >
                Fazer Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fallback - redirecionar para checkout se chegou aqui sem session_id
  return (
    <div className="min-h-screen bg-brand-bg-gray">
      <Header />
      <div className="flex items-center justify-center py-12 px-6">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <p>Redirecionando para o checkout...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateAccount;
