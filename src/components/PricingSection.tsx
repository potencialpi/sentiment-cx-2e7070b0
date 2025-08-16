
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Brain, Infinity } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const navigate = useNavigate();

  const handleSignup = (planId: string) => {
    navigate("/create-account", { 
      state: { 
        selectedPlan: planId, 
        billingType: billingCycle 
      } 
    });
  };

  const plans = [
    {
      id: "start-quantico",
      name: "Pulso Quântico",
      icon: <Zap className="h-6 w-6" />,
      description: "Para startups e pequenas empresas que querem começar com análise de sentimento avançada",
      monthlyPrice: 97,
      yearlyPrice: 970,
      savings: billingCycle === "yearly" ? "2 meses grátis" : null,
      features: [
        "Até 1.000 análises/mês",
        "Dashboard básico em tempo real",
        "3 canais de coleta (email, chat, forms)",
        "Relatórios semanais automatizados",
        "Suporte por email",
        "Integração com 5 ferramentas",
        "Retenção de dados: 6 meses"
      ],
      recommended: false,
      color: "from-blue-500 to-purple-600"
    },
    {
      id: "vortex-neural",
      name: "Vórtex Neural",
      icon: <Brain className="h-6 w-6" />,
      description: "Para empresas em crescimento que precisam de análise preditiva e insights avançados",
      monthlyPrice: 297,
      yearlyPrice: 2970,
      savings: billingCycle === "yearly" ? "2 meses grátis" : null,
      features: [
        "Até 10.000 análises/mês",
        "Dashboard avançado + predições neurais",
        "10 canais de coleta ilimitados",
        "Relatórios diários + alertas inteligentes",
        "Suporte prioritário + chat ao vivo",
        "Integração com 25 ferramentas + API",
        "Análise de tendências preditivas (30 dias)",
        "Segmentação avançada de clientes",
        "Retenção de dados: 2 anos"
      ],
      recommended: true,
      color: "from-purple-600 to-pink-600"
    },
    {
      id: "nexus-infinito",
      name: "Nexus Infinito",
      icon: <Infinity className="h-6 w-6" />,
      description: "Para grandes empresas que necessitam de análise multidimensional e insights profundos",
      monthlyPrice: 597,
      yearlyPrice: 5970,
      savings: billingCycle === "yearly" ? "2 meses grátis" : null,
      features: [
        "Análises ilimitadas",
        "Dashboard multidimensional + IA quântica",
        "Canais de coleta ilimitados + APIs personalizadas",
        "Relatórios em tempo real + alertas personalizados",
        "Gerente de conta dedicado + suporte 24/7",
        "Integrações ilimitadas + webhooks",
        "Análise preditiva multivariável (90 dias)",
        "Análise comportamental profunda",
        "Benchmarking competitivo",
        "White-label disponível",
        "Retenção de dados: ilimitada"
      ],
      recommended: false,
      color: "from-pink-600 to-orange-500"
    }
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-background via-secondary/5 to-primary/5">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-6">
            Escolha Seu Plano de Transformação
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Cada plano foi cuidadosamente desenvolvido para maximizar o potencial da sua análise de sentimento
          </p>
          
          <div className="flex items-center justify-center space-x-4 mb-8">
            <Button
              variant={billingCycle === "monthly" ? "default" : "outline"}
              onClick={() => setBillingCycle("monthly")}
              className="px-6 py-2"
            >
              Mensal
            </Button>
            <Button
              variant={billingCycle === "yearly" ? "default" : "outline"}
              onClick={() => setBillingCycle("yearly")}
              className="px-6 py-2"
            >
              Anual
              <Badge variant="secondary" className="ml-2">
                -17%
              </Badge>
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => {
            const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
            const monthlyEquivalent = billingCycle === "yearly" ? Math.round(plan.yearlyPrice / 12) : price;
            
            return (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
                  plan.recommended 
                    ? "ring-2 ring-primary shadow-2xl shadow-primary/25" 
                    : "hover:shadow-xl"
                }`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 left-0 right-0">
                    <div className={`bg-gradient-to-r ${plan.color} px-4 py-2 text-center`}>
                      <span className="text-white font-semibold text-sm">
                        🚀 MAIS POPULAR
                      </span>
                    </div>
                  </div>
                )}
                
                <CardHeader className={`text-center ${plan.recommended ? "pt-12" : "pt-6"}`}>
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center text-white`}>
                    {plan.icon}
                  </div>
                  <CardTitle className="text-2xl font-bold text-primary">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground px-2">
                    {plan.description}
                  </CardDescription>
                  
                  <div className="py-6">
                    <div className="text-4xl font-bold text-primary">
                      R$ {price.toLocaleString()}
                      <span className="text-lg font-normal text-muted-foreground">
                        /{billingCycle === "monthly" ? "mês" : "ano"}
                      </span>
                    </div>
                    {billingCycle === "yearly" && (
                      <div className="text-sm text-muted-foreground mt-2">
                        R$ {monthlyEquivalent}/mês • {plan.savings}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="px-6 pb-8">
                  <Button 
                    className={`w-full mb-6 text-lg py-6 bg-gradient-to-r ${plan.color} hover:opacity-90 transition-opacity text-white border-0`}
                    onClick={() => handleSignup(plan.id)}
                  >
                    Começar Agora
                  </Button>
                  
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start space-x-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground leading-relaxed">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Todos os planos incluem garantia de 30 dias • Sem taxas de setup • Cancele a qualquer momento
          </p>
          <p className="text-sm text-muted-foreground">
            Precisa de algo personalizado? 
            <Button variant="link" className="p-0 h-auto ml-1 text-primary">
              Entre em contato conosco
            </Button>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
