import React, { useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Check, X, Loader2 } from 'lucide-react';

const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;

const checkoutSchema = z.object({
  email: z.string().email('E-mail inválido'),
  companyName: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  phoneNumber: z.string()
    .min(10, 'Número de telefone deve ter pelo menos 10 dígitos')
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Formato inválido. Use: (xx) xxxxx-xxxx'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(passwordRegex, 'Senha deve conter pelo menos 1 número e 1 caractere especial'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword']
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

const plans = [
  { id: 'start-quantico', name: 'Start Quântico', monthlyPrice: 349, yearlyPrice: 3499, monthlyDisplay: 'R$ 349/mês', yearlyDisplay: 'R$ 3.499/ano' },
  { id: 'vortex-neural', name: 'Vortex Neural', monthlyPrice: 649, yearlyPrice: 6199, monthlyDisplay: 'R$ 649/mês', yearlyDisplay: 'R$ 6.199/ano' },
  { id: 'nexus-infinito', name: 'Nexus Infinito', monthlyPrice: 1249, yearlyPrice: 11899, monthlyDisplay: 'R$ 1.249/mês', yearlyDisplay: 'R$ 11.899/ano' }
];

const CheckoutGuest = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedPlan, billingType } = location.state || {};
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasNumber: false,
    hasSpecial: false
  });

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Format as (xx) xxxxx-xxxx or (xx) xxxx-xxxx
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema)
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setValue('phoneNumber', formatted);
  };

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  React.useEffect(() => {
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

  const onSubmit = async (data: CheckoutForm) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call the new guest checkout function
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout-guest', {
        body: {
          email: data.email,
          companyName: data.companyName,
          phoneNumber: data.phoneNumber.replace(/\D/g, ''), // Send only numbers
          password: data.password,
          planId: selectedPlan?.id || 'start-quantico',
          billingType: billingType || 'monthly'
        }
      });

      if (checkoutError) {
        console.error('Erro create-checkout-guest:', checkoutError);
        setError('Não foi possível iniciar o checkout. Tente novamente.');
        return;
      }

      if (checkoutData?.url) {
        // Redirect to Stripe checkout
        window.location.href = checkoutData.url;
      } else {
        console.warn('URL de checkout não recebida do backend', checkoutData);
        setError('Não foi possível iniciar o checkout agora. Por favor, tente novamente em alguns instantes.');
        return;
      }
    } catch (err) {
      console.error('Erro ao criar checkout:', err);
      setError('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPlanData = plans.find(plan => plan.id === selectedPlan?.id);

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-brand-bg-gray">
        <Header />
        <div className="flex items-center justify-center py-12 px-6">
          <Card className="w-full max-w-md">
            <CardContent className="text-center p-8">
              <p>Nenhum plano selecionado.</p>
              <Button onClick={() => navigate('/')} className="mt-4">
                Voltar à Página Inicial
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg-gray">
      <Header />
      <div className="flex items-center justify-center py-12 px-6">
        <Card className="w-full max-w-2xl bg-brand-white shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-brand-dark-blue mb-4">
              Finalizar Pagamento
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
            
            <p className="text-sm text-muted-foreground">
              Seus dados serão criados apenas após a confirmação do pagamento.
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert className="border-red-600 bg-red-500/20">
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
                    className="border-gray-500 focus:border-brand-green focus:ring-brand-green"
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
                    className="border-gray-500 focus:border-brand-green focus:ring-brand-green"
                  />
                  {errors.companyName && (
                    <p className="text-red-500 text-sm">{errors.companyName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-brand-dark-blue font-medium">
                  Telefone Celular *
                </Label>
                <Input
                  id="phoneNumber"
                  placeholder="(11) 99999-9999"
                  {...register('phoneNumber')}
                  onChange={handlePhoneChange}
                  className="border-gray-500 focus:border-brand-green focus:ring-brand-green"
                  maxLength={15}
                />
                <p className="text-xs text-brand-dark-blue/70">
                  Número usado para verificação SMS do pagamento
                </p>
                {errors.phoneNumber && (
                  <p className="text-red-500 text-sm">{errors.phoneNumber.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="border-gray-500 focus:border-brand-green focus:ring-brand-green pr-12"
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
                    className="border-gray-500 focus:border-brand-green focus:ring-brand-green pr-12"
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
                  onClick={() => navigate('/')}
                  className="border-brand-dark-blue text-brand-dark-blue hover:bg-brand-dark-blue hover:text-white"
                >
                  Voltar
                </Button>
                
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-brand-green hover:bg-brand-green/90 text-white flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    `Pagar ${billingType === 'yearly' ? selectedPlanData?.yearlyDisplay : selectedPlanData?.monthlyDisplay}`
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckoutGuest;