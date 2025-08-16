// Configurações específicas para cada plano

export interface PlanConfig {
  planName: string;
  planTitle: string;
  planDescription: string;
  maxQuestions: number;
  maxResponses: number;
  maxSurveysPerMonth: number;
  backRoute: string;
  features: {
    analytics: {
      basic: string[];
      advanced: string[];
      charts: string[];
      export: string[];
    };
    sentiment: {
      levels: string[];
      segmentation: string[];
    };
    statistics: {
      basic: string[];
      advanced: string[];
    };
  };
}

// Configuração do Plano Start Quântico
export const startQuanticoConfig: PlanConfig = {
  planName: "Start Quântico",
  planTitle: "Start Quântico",
  planDescription: "Plano inicial com recursos essenciais para análise de sentimentos e criação de pesquisas básicas.",
  maxQuestions: 5,
  maxResponses: 100,
  maxSurveysPerMonth: 2,
  backRoute: "/dashboard",
  features: {
    analytics: {
      basic: ["Análise básica de sentimentos", "Relatórios simples", "Estatísticas descritivas"],
      advanced: ["Análise de tendências básicas", "Segmentação por demografia"],
      charts: ["Gráficos de barras", "Gráficos de pizza", "Histogramas"],
      export: ["CSV", "JSON"]
    },
    sentiment: {
      levels: ["Positivo", "Neutro", "Negativo"],
      segmentation: ["Por idade", "Por gênero"]
    },
    statistics: {
      basic: ["Média", "Mediana", "Moda", "Desvio padrão", "Percentis"],
      advanced: ["Gráficos interativos simples (barra, pizza)"]
    }
  }
};

// Configuração do Plano Vortex Neural
export const vortexNeuralConfig: PlanConfig = {
  planName: "Vortex Neural",
  planTitle: "Vortex Neural",
  planDescription: "Plano intermediário com análises avançadas de IA e recursos de machine learning para insights profundos.",
  maxQuestions: 10,
  maxResponses: 250,
  maxSurveysPerMonth: 4,
  backRoute: "/dashboard",
  features: {
    analytics: {
      basic: ["Análise avançada de sentimentos", "Relatórios detalhados", "Estatísticas inferenciais"],
      advanced: ["Machine Learning", "Análise preditiva", "Clustering automático", "Detecção de anomalias"],
      charts: ["Gráficos de barras", "Gráficos de pizza", "Histogramas", "Scatter plots", "Heatmaps"],
      export: ["CSV", "JSON", "Parquet"]
    },
    sentiment: {
      levels: ["Muito Positivo", "Positivo", "Neutro", "Negativo", "Muito Negativo"],
      segmentation: ["Por idade", "Por gênero", "Por localização", "Por comportamento"]
    },
    statistics: {
      basic: ["Média", "Mediana", "Moda", "Desvio padrão", "Percentis", "Correlação"],
      advanced: ["Análise segmentada por temas (atendimento, produto, preço)", "Boxplot para identificar outliers"]
    }
  }
};

// Configuração do Plano Nexus Infinito
export const nexusInfinitoConfig: PlanConfig = {
  planName: "Nexus Infinito",
  planTitle: "Nexus Infinito",
  planDescription: "Plano premium com recursos ilimitados, IA avançada e análises em tempo real para empresas de grande porte.",
  maxQuestions: 999999, // Ilimitado
  maxResponses: 999999, // Ilimitado
  maxSurveysPerMonth: 15,
  backRoute: "/dashboard",
  features: {
    analytics: {
      basic: ["Análise de sentimentos em tempo real", "Relatórios executivos", "Estatísticas avançadas"],
      advanced: [
        "Deep Learning", 
        "Análise preditiva avançada", 
        "Processamento de linguagem natural", 
        "Análise de emoções", 
        "Segmentação inteligente", 
        "Alertas automáticos",
        "Integração com APIs externas"
      ],
      charts: [
        "Gráficos de barras", 
        "Gráficos de pizza", 
        "Histogramas", 
        "Scatter plots", 
        "Heatmaps", 
        "Gráficos de linha temporal", 
        "Dashboards interativos"
      ],
      export: ["CSV", "JSON", "Parquet", "Excel", "PDF"]
    },
    sentiment: {
      levels: [
        "Extremamente Positivo", 
        "Muito Positivo", 
        "Positivo", 
        "Levemente Positivo", 
        "Neutro", 
        "Levemente Negativo", 
        "Negativo", 
        "Muito Negativo", 
        "Extremamente Negativo"
      ],
      segmentation: [
        "Por idade", 
        "Por gênero", 
        "Por localização", 
        "Por comportamento", 
        "Por histórico de compras", 
        "Por engajamento", 
        "Por valor do cliente"
      ]
    },
    statistics: {
      basic: [
        "Média", 
        "Mediana", 
        "Moda", 
        "Desvio padrão", 
        "Quartis", 
        "Percentis", 
        "Coeficiente de variação"
      ],
      advanced: [
        "Regressão múltipla", 
        "Análise de variância multivariada", 
        "Testes estatísticos avançados", 
        "Análise de séries temporais", 
        "Modelagem preditiva", 
        "Análise de sobrevivência",
        "Análise de componentes principais"
      ]
    }
  }
};

// Função helper para obter configuração por nome do plano
export const getPlanConfig = (planName: string): PlanConfig => {
  switch (planName.toLowerCase()) {
    case 'start quantico':
    case 'start quântico':
      return startQuanticoConfig;
    case 'vortex neural':
      return vortexNeuralConfig;
    case 'nexus infinito':
      return nexusInfinitoConfig;
    default:
      throw new Error(`Configuração não encontrada para o plano: ${planName}`);
  }
};

// Exportar todas as configurações
export const allPlanConfigs = {
  startQuantico: startQuanticoConfig,
  vortexNeural: vortexNeuralConfig,
  nexusInfinito: nexusInfinitoConfig
};