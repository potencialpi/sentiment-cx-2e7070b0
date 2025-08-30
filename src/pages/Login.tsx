import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { getPlanAdminRoute, getUserPlan } from '@/lib/planUtils';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

type LoginForm = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const redirectToCorrectAdminPage = async (userId: string) => {
    try {
      // Usar a função getUserPlan que busca nas tabelas corretas (companies e profiles)
      const planCode = await getUserPlan(supabase, userId);

      console.log('Login - Plano encontrado:', planCode);
      
      // Redireciona para a página administrativa correta baseada no plano
      const adminRoute = getPlanAdminRoute(planCode);
      console.log('Login - Redirecionando para:', adminRoute);
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

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      // Usar login seguro com isolamento melhorado
      const { signInSecurely } = await import('@/lib/authUtils');
      const { data: authData, error: authError } = await signInSecurely(data.email, data.password);

      if (authError) {
        setError('E-mail ou senha incorretos');
        return;
      }

      if (authData?.user) {
        toast({
          title: 'Login realizado com sucesso!',
          description: 'Redirecionando para o painel...'
        });
        
        // Redirecionar automaticamente para a página correta baseada no plano
        await redirectToCorrectAdminPage(authData.user.id);
      }
    } catch (err) {
      setError('Erro interno. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg-gray">
      <Header />
      <div className="flex items-center justify-center py-12 px-6">
        <Card className="w-full max-w-md bg-brand-white shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-brand-dark-blue">
              Fazer Login
            </CardTitle>
            <CardDescription className="text-brand-dark-blue/70">
              Entre com suas credenciais para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert className="border-red-600 bg-red-500/20">
                  <AlertDescription className="text-red-600">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-brand-dark-blue font-medium">
                  E-mail profissional
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
                <Label htmlFor="password" className="text-brand-dark-blue font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    {...register('password')}
                    className="border-gray-500 focus:border-brand-green focus:ring-brand-green pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-brand-dark-blue transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-green hover:bg-brand-green/90 text-white"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-brand-dark-blue/70">
                Não tem uma conta?{' '}
                <Link 
                  to="/" 
                  className="text-brand-green hover:underline font-medium"
                >
                  Criar conta
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link 
                to="/" 
                className="text-sm text-brand-dark-blue/70 hover:underline"
              >
                Voltar ao início
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;