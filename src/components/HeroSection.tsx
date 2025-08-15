import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { getPlanAdminRoute } from '@/lib/planUtils';
+import { getPlanAdminRoute, getUserPlan } from '@/lib/planUtils';

const HeroSection = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Erro no login",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        let planCode = 'start-quantico'; // fallback padrão
        try {
          planCode = await getUserPlan(supabase, data.user.id);
        } catch (e) {
          console.warn('Falha ao obter plano via getUserPlan, usando fallback.', e);
        }
 
         console.log('HeroSection - Plano encontrado:', planCode);
         const planRoute = getPlanAdminRoute(planCode);
         console.log('HeroSection - Redirecionando para:', planRoute);
        
        toast({
          title: "Login realizado com sucesso!",
          description: "Redirecionando para o painel administrativo...",
        });
        
        // Aguardar um momento e redirecionar
        setTimeout(() => {
          navigate(planRoute);
        }, 1000);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns momentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToPlans = () => {
    const element = document.getElementById('plans');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen bg-hero flex items-center justify-center px-6 py-12">
      <div className="max-w-7xl w-full grid lg:grid-cols-2 gap-12 items-center">
        {/* Conteúdo Principal */}
        <div className="text-center lg:text-left space-y-8">
          <div className="space-y-4">
            <h1 className="text-hero text-brand-white font-bold leading-tight">
              Sentiment CX: Pesquisas de Mercado e Opinião
            </h1>
            <p className="text-subtitle text-brand-white/90 max-w-2xl">
              Crie questionários, analise sentimentos e obtenha insights com IA
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Button 
              onClick={scrollToPlans}
              variant="hero"
              size="lg"
              className="px-8 py-3 text-lg font-semibold"
            >
              Comece Agora
            </Button>
            <Button 
              variant="outlineLight" 
              size="lg"
              className="px-8 py-3 text-lg"
            >
              Saiba Mais
            </Button>
          </div>
        </div>

        {/* Formulário de Login */}
        <div className="flex justify-center lg:justify-end">
          <Card className="w-full max-w-md bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-brand-white text-center">
                Entrar na Plataforma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-brand-white text-sm">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="bg-white/20 border-white/30 text-brand-white placeholder:text-white/60"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-brand-white text-sm">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-white/20 border-white/30 text-brand-white placeholder:text-white/60"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  variant="hero"
                  className="w-full py-3 font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;