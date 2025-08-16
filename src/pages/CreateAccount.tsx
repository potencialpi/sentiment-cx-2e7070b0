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
  const { selectedPlan, billingType } = location.state || {};
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasNumber: false,
    hasSpecial: false
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CreateAccountForm>({
    resolver: zodResolver(createAccountSchema)
  });

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  const redirectToCorrectAdminPage = async (userId: string) => {
    try {
      // Usar a função getUserPlan que busca nas tabelas corretas (companies e profiles)
      const planCode = await getUserPlan(supabase, userId);

      console.log('CreateAccount - Plano encontrado:', planCode);
      
      // Redireciona para a página administrativa correta baseada no plano
      const adminRoute = getPlanAdminRoute(planCode);
      console.log('CreateAccount - Redirecionando para:', adminRoute);
      navigate(adminRoute);
    } catch (error) {
      console.error('Erro ao buscar plano do usuário:', error);
      // Em caso de erro, redireciona para o dashboard padrão
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    // Verificar se usuário já está logado
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await redirectToCorrectAdminPage(session.user.id);
      }
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    if (password) {
      setPasswordValidation({
        minLength: password.length >= 8,
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*]/.test(password)
      });
    } else {
      setPasswordValidation({
        minLength: false,
        hasNumber: false,
        hasSpecial: false
      });
    }
  }, [password]);

  const onSubmit = async (data: CreateAccountForm) => {
    setIsLoading(true);
    setError(null);

    try {
      // Definir plano padrão como 'start-quantico'
      const defaultPlan = 'start-quantico';
      
      // Registrar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            company_name: data.companyName,
            plan_id: selectedPlan?.id || 'start-quantico',
            billing_type: billingType || 'monthly'
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Este e-mail já está cadastrado. Tente fazer login.');
        } else {
          setError('Erro ao criar conta. Tente novamente.');
        }
        return;
      }

      if (authData.user) {
        // Criar registros nas tabelas profiles e companies manualmente
        // já que os triggers não estão funcionando
        try {
          const userId = authData.user.id;
          const planId = selectedPlan?.id || 'start-quantico';
          
          // Criar profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: userId,
              plan_name: planId,
              status: 'active'
            });

          if (profileError) {
            console.error('Erro ao criar profile:', profileError);
            // Não falhar o processo, apenas logar o erro
          }

          // Criar company
          const { error: companyError } = await supabase
            .from('companies')
            .insert({
              user_id: userId,
              company_name: data.companyName,
              plan_name: planId
            });

          if (companyError) {
            console.error('Erro ao criar company:', companyError);
            // Não falhar o processo, apenas logar o erro
          }

          toast({
            title: 'Conta criada com sucesso!',
            description: 'Agora você pode prosseguir com o pagamento.'
          });
          
          // Mostrar o componente de pagamento
          setUserEmail(data.email);
          setShowPayment(true);
          
        } catch (profileCompanyError) {
          console.error('Erro ao criar profile/company:', profileCompanyError);
          // Mesmo com erro nos registros auxiliares, o usuário foi criado
          toast({
            title: 'Conta criada com sucesso!',
            description: 'Agora você pode prosseguir com o pagamento.'
          });
          
          // Mostrar o componente de pagamento
          setUserEmail(data.email);
          setShowPayment(true);
        }
      }
    } catch (err) {
      console.error('Erro ao criar conta:', err);
      console.log('Detalhes do erro:', {
        selectedPlan,
        billingType,
        email: data.email,
        error: err
      });
      setError('Erro interno. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPlanData = plans.find(plan => plan.id === selectedPlan?.id);

  return (
    <div className="min-h-screen bg-brand-bg-gray">
      <Header />
      <div className="flex items-center justify-center py-12 px-6">
        <Card className="w-full max-w-2xl bg-brand-white shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-brand-dark-blue mb-4">
              Criar Conta
            </CardTitle>
            
            {selectedPlanData && (
              <div className="bg-muted p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-brand-dark-blue mb-2">
                  Plano Selecionado: {selectedPlanData.name}
                </h3>
                <p className="text-lg text-brand-green font-bold">
                  {billingType === 'yearly' ? selectedPlanData.yearlyDisplay : selectedPlanData.monthlyDisplay}
                </p>
                <p className="text-sm text-brand-dark-blue/70">
                  {billingType === 'yearly' ? 'Pagamento à vista' : 'Pagamento mensal'}
                </p>
              </div>
            )}
          </CardHeader>
          
          <CardContent>
            {showPayment ? (
              <div className="space-y-6">
                <StripeCheckout
                  planId={selectedPlan?.id || 'start-quantico'}
                  planName={selectedPlanData?.name || 'Start Quântico'}
                  billingType={billingType || 'monthly'}
                  price={billingType === 'yearly' ? (selectedPlanData?.yearlyPrice || 3499) : (selectedPlanData?.monthlyPrice || 349)}
                  customerEmail={userEmail}
                  onSuccess={() => {
                    toast({
                      title: 'Pagamento realizado com sucesso!',
                      description: 'Redirecionando para o dashboard...'
                    });
                    setTimeout(() => navigate('/dashboard'), 2000);
                  }}
                  onCancel={() => {
                    setShowPayment(false);
                  }}
                />
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowPayment(false)}
                    className="border-brand-dark-blue text-brand-dark-blue hover:bg-brand-dark-blue hover:text-white"
                  >
                    Voltar ao Formulário
                  </Button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert className="border-red-500 bg-red-50">
                  <AlertDescription className="text-red-600">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-brand-dark-blue font-medium">
                    E-mail profissional *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    {...register('email')}
                    className="border-gray-300 focus:border-brand-green focus:ring-brand-green"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-brand-dark-blue font-medium">
                    Nome da empresa/responsável *
                  </Label>
                  <Input
                    id="companyName"
                    placeholder="Nome da sua empresa"
                    {...register('companyName')}
                    className="border-gray-300 focus:border-brand-green focus:ring-brand-green"
                  />
                  {errors.companyName && (
                    <p className="text-red-500 text-sm">{errors.companyName.message}</p>
                  )}
                </div>
              </div>



              <div className="space-y-2">
                <Label htmlFor="password" className="text-brand-dark-blue font-medium">
                  Senha *
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    {...register('password')}
                    className="border-gray-300 focus:border-brand-green focus:ring-brand-green pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
                
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center space-x-2">
                      {passwordValidation.minLength ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <X size={16} className="text-red-500" />
                      )}
                      <span className={`text-sm ${passwordValidation.minLength ? 'text-green-500' : 'text-red-500'}`}>
                        Mínimo 8 caracteres
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {passwordValidation.hasNumber ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <X size={16} className="text-red-500" />
                      )}
                      <span className={`text-sm ${passwordValidation.hasNumber ? 'text-green-500' : 'text-red-500'}`}>
                        Pelo menos 1 número
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {passwordValidation.hasSpecial ? (
                        <Check size={16} className="text-green-500" />
                      ) : (
                        <X size={16} className="text-red-500" />
                      )}
                      <span className={`text-sm ${passwordValidation.hasSpecial ? 'text-green-500' : 'text-red-500'}`}>
                        Pelo menos 1 caractere especial (!@#$%^&*)
                      </span>
                    </div>
                  </div>
                )}
                
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-brand-dark-blue font-medium">
                  Repetir senha *
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme sua senha"
                    {...register('confirmPassword')}
                    className="border-gray-300 focus:border-brand-green focus:ring-brand-green pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
                
                {confirmPassword && password && (
                  <div className="flex items-center space-x-2 mt-2">
                    {confirmPassword === password ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <X size={16} className="text-red-500" />
                    )}
                    <span className={`text-sm ${confirmPassword === password ? 'text-green-500' : 'text-red-500'}`}>
                      {confirmPassword === password ? 'Senhas coincidem' : 'Senhas não coincidem'}
                    </span>
                  </div>
                )}
                
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/choose-plan')}
                  className="border-brand-dark-blue text-brand-dark-blue hover:bg-brand-dark-blue hover:text-white"
                >
                  Voltar
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="text-brand-green hover:bg-brand-green/10"
                >
                  Sair
                </Button>
                
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-brand-green hover:bg-brand-green/90 text-white flex-1"
                >
                  {isLoading ? 'Criando conta...' : 'Criar Conta e Começar'}
                </Button>
              </div>
            </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateAccount;