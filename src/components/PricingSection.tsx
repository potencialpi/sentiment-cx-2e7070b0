import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
- import { getPlanAdminRoute } from '@/lib/planUtils';
+ // import { getPlanAdminRoute } from '@/lib/planUtils';

const plans = [
  {
    id: 'start-quantico',
    name: 'Start Quântico',
    monthlyPrice: 349,
    yearlyPrice: 3499,
    features: [
      'Até 5 questões por pesquisa',
      '50 respostas por pesquisa',
      '3 pesquisas por mês',
      'Análise estatística básica',
      'Análise de sentimento simples'
    ],
    recommended: false
  },
  {
    id: 'vortex-neural',
    name: 'Vortex Neural',
    monthlyPrice: 649,
    yearlyPrice: 6199,
    features: [
      'Até 10 questões por pesquisa',
      '250 respostas por pesquisa',
      '4 pesquisas por mês',
      'Análise estatística intermediária',
      'Análise de sentimentos segmentada'
    ],
    recommended: true
  },
  {
    id: 'nexus-infinito',
    name: 'Nexus Infinito',
    monthlyPrice: 1249,
    yearlyPrice: 11899,
    features: [
      'Questões ilimitadas por pesquisa',
      'Respostas ilimitadas por pesquisa',
      'Pesquisas ilimitadas por mês',
      'Análise estatística avançada',
      'Análise de sentimento multicanal',
      'Modelos preditivos avançados'
    ],
    recommended: false
  }
];

const PricingSection = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
-    if (!email || !password || !selectedPlan) {
+    if (!selectedPlan) {
       toast({
         title: "Erro no cadastro",
-        description: "Por favor, preencha todos os campos e selecione um plano.",
+        description: "Por favor, selecione um plano para continuar.",
         variant: "destructive",
       });
       return;
     }
-
-    if (password.length < 8) {
-      toast({
-        title: "Erro na senha",
-        description: "A senha deve ter pelo menos 8 caracteres.",
-        variant: "destructive",
-      });
-      return;
-    }
-
-    setLoading(true);
-    try {
-      // Configurar redirect URL para autenticação
-      const redirectUrl = `${window.location.origin}/create-survey-start`;
-      
-      const { data, error } = await supabase.auth.signUp({
-        email,
-        password,
-        options: {
-          emailRedirectTo: redirectUrl,
-          data: {
-            plan: selectedPlan,
-            billing: isYearly ? 'yearly' : 'monthly'
-          }
-        }
-      });
-
-      if (error) {
-        console.error('Signup error:', error);
-        toast({
-          title: "Erro no cadastro",
-          description: error.message,
-          variant: "destructive",
-        });
-        return;
-      }
-
-      if (data.user) {
-        // Criar perfil do usuário
-        const { error: profileError } = await supabase
-          .from('user_plans')
-          .insert({
-            user_id: data.user.id,
-            plan_name: selectedPlan,
-            status: 'active'
-          });
-
-        if (profileError) {
-          console.error('Profile creation error:', profileError);
-        }
-
-        const planRoute = getPlanAdminRoute(selectedPlan);
-        
-        toast({
-          title: "Cadastro realizado com sucesso!",
-          description: `Plano ${plans.find(p => p.id === selectedPlan)?.name} selecionado. Verifique seu e-mail para confirmar a conta.`,
-        });
-
-        // Limpar formulário
-        setEmail('');
-        setPassword('');
-        setSelectedPlan('');
-        
-        // Aguardar um momento e redirecionar
-        setTimeout(() => {
-          navigate(planRoute);
-        }, 2000);
-      }
-    } catch (error) {
-      console.error('Unexpected error:', error);
-      toast({
-        title: "Erro inesperado",
-        description: "Tente novamente em alguns momentos.",
-        variant: "destructive",
-      });
-    } finally {
-      setLoading(false);
-    }
+    // Em vez de criar a conta aqui, redirecionar para a página de criação de conta
+    const plan = plans.find(p => p.id === selectedPlan);
+    navigate('/create-account', {
+      state: {
+        selectedPlan: plan,
+        billingType: isYearly ? 'yearly' : 'monthly'
+      }
+    });
   };

  return (
    <section id="plans" className="bg-section-light py-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header da Seção */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-brand-dark-gray mb-4">
            Escolha o Plano Ideal para Sua Empresa
          </h2>
          <p className="text-subtitle text-brand-dark-gray/80 max-w-3xl mx-auto">
            Flexibilidade para startups, médias e grandes empresas
          </p>
          
          {/* Botões de Preços */}
          <div className="flex items-center justify-center mt-8">
            <div className="bg-gray-100 p-1 rounded-lg flex">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2 rounded-md font-semibold transition-all duration-200 ${
                  !isYearly 
                    ? 'bg-white text-brand-dark-gray shadow-sm' 
                    : 'text-brand-dark-gray/60 hover:text-brand-dark-gray'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2 rounded-md font-semibold transition-all duration-200 ${
                  isYearly 
                    ? 'bg-white text-brand-dark-gray shadow-sm' 
                    : 'text-brand-dark-gray/60 hover:text-brand-dark-gray'
                }`}
              >
                Anual
                <span className="ml-1 text-xs text-primary font-normal">
                  (até 15% off)
                </span>
              </button>
            </div>
          </div>
        </div>



        {/* Cards de Planos */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`card-pricing relative bg-white ${
                plan.recommended ? 'ring-2 ring-brand-green shadow-xl scale-105' : 'shadow-lg'
              }`}
            >
              {plan.recommended && (
                <>
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-brand-green text-brand-white px-4 py-1 text-sm font-bold rounded-full">
                      MAIS POPULAR
                    </span>
                  </div>
                  {isYearly && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gray-600 text-white px-3 py-1 text-xs font-semibold rounded">
                        valor anual
                      </span>
                    </div>
                  )}
                </>
              )}
              
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl font-bold text-brand-dark-gray mb-4">
                  {plan.name}
                </CardTitle>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-brand-dark-gray">
                    R$ {isYearly ? plan.yearlyPrice.toLocaleString() : plan.monthlyPrice.toLocaleString()}
                  </span>
                </div>
                <span className="text-brand-dark-gray/60 text-sm">
                  {isYearly ? 'à vista' : '/mês'}
                </span>
              </CardHeader>
              
              <CardContent className="px-6">
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <Check className="w-4 h-4 text-brand-green flex-shrink-0" />
                      <span className="text-sm text-brand-dark-gray">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                 <Button 
                  onClick={() => setSelectedPlan(plan.id)}
                  className="w-full py-3 font-semibold bg-brand-green hover:bg-brand-green/90 text-brand-white border-0"
                >
                  {selectedPlan === plan.id ? 'Selecionado' : 'Escolher Plano'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Formulário de Cadastro */}
        <div className="max-w-md mx-auto">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-brand-dark-gray text-center">
                Criar Conta
              </CardTitle>
              <p className="text-center text-brand-dark-gray/60">
                Comece sua jornada com insights poderosos
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-brand-dark-gray">
                    E-mail Profissional
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@empresa.com"
                    className="py-3"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-brand-dark-gray">
                    Senha
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="py-3"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="plan-select" className="text-brand-dark-gray">
                    Escolha seu Plano
                  </Label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan} required>
                    <SelectTrigger className="py-3">
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - R$ {isYearly ? plan.yearlyPrice.toLocaleString() : plan.monthlyPrice.toLocaleString()}{isYearly ? '/ano' : '/mês'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  type="submit" 
                  variant="hero"
                  className="w-full py-3 text-lg font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Criando conta...' : 'Criar Conta e Começar'}
                </Button>
                
                <p className="text-xs text-brand-dark-gray/60 text-center leading-relaxed">
                  Ao criar uma conta, você concorda com nossos{' '}
                  <a href="#" className="text-primary hover:underline">Termos de Uso</a>{' '}
                  e{' '}
                  <a href="#" className="text-primary hover:underline">Política de Privacidade</a>{' '}
                  em conformidade com a LGPD.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;