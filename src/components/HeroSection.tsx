
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/");
  };

  return (
    <section className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl lg:text-7xl font-bold text-primary mb-6 leading-tight">
            Sentiment<span className="text-secondary">CX</span>
          </h1>
          <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-4xl mx-auto leading-relaxed">
            A primeira plataforma de análise de sentimento que combina{" "}
            <span className="text-primary font-semibold">Inteligência Artificial</span>,{" "}
            <span className="text-secondary font-semibold">análise preditiva</span> e{" "}
            <span className="text-accent font-semibold">insights em tempo real</span>{" "}
            para revolucionar sua experiência do cliente.
          </p>
          <Button 
            onClick={handleGetStarted}
            size="lg" 
            className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Comece Agora
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="text-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
            <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              IA Quântica
            </h3>
            <p className="text-muted-foreground">
              Análise de sentimento com precisão de 98.7% usando algoritmos quânticos
            </p>
          </div>
          <div className="text-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
            <TrendingUp className="h-12 w-12 text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              Predição Neural
            </h3>
            <p className="text-muted-foreground">
              Antecipe tendências de satisfação com 30 dias de antecedência
            </p>
          </div>
          <div className="text-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
            <Users className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              Insights Infinitos
            </h3>
            <p className="text-muted-foreground">
              Dashboards multidimensionais com análise comportamental profunda
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
