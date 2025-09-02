import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Users, Target, Zap, RefreshCw } from 'lucide-react';
import { 
  performKMeansClustering, 
  calculatePredictiveModels, 
  prepareDataForClustering, 
  generateClusterInsights,
  ClusterResult,
  PredictiveModel 
} from '@/utils/clusteringUtils';
import { calculateStatisticalSummary } from '@/utils/statisticalAnalysis';

interface AdvancedClusteringAnalysisProps {
  surveyData: any[];
  isLoading?: boolean;
}

export const AdvancedClusteringAnalysis: React.FC<AdvancedClusteringAnalysisProps> = ({ 
  surveyData, 
  isLoading = false 
}) => {
  const [clusterResults, setClusterResults] = useState<ClusterResult | null>(null);
  const [predictiveModels, setPredictiveModels] = useState<PredictiveModel[]>([]);
  const [processing, setProcessing] = useState(false);
  const [selectedK, setSelectedK] = useState(3);

  useEffect(() => {
    if (surveyData && surveyData.length > 0) {
      performAnalysis();
    }
  }, [surveyData, selectedK]);

  const performAnalysis = async () => {
    if (!surveyData || surveyData.length < 2) return;

    setProcessing(true);
    
    try {
      // Preparar dados para clustering
      const numericData = prepareDataForClustering(surveyData);
      
      if (numericData.length === 0) {
        setProcessing(false);
        return;
      }

      // Executar clustering K-means
      const clusterResult = performKMeansClustering(numericData, selectedK);
      setClusterResults(clusterResult);

      // Calcular modelos preditivos
      const sentimentScores = surveyData
        .map(response => response.sentiment_score || 0)
        .filter(score => !isNaN(score));
      
      if (sentimentScores.length > 0) {
        const models = calculatePredictiveModels(sentimentScores);
        setPredictiveModels(models);
      }

    } catch (error) {
      console.error('Erro na análise de clustering:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getModelIcon = (type: string) => {
    switch (type) {
      case 'recommendation': return <Target className="w-4 h-4" />;
      case 'satisfaction': return <TrendingUp className="w-4 h-4" />;
      case 'churn': return <Zap className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getModelTitle = (type: string) => {
    switch (type) {
      case 'recommendation': return 'Probabilidade de Recomendação';
      case 'satisfaction': return 'Índice de Satisfação';
      case 'churn': return 'Risco de Churn';
      default: return 'Modelo Preditivo';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProbabilityColor = (probability: number, type: string) => {
    if (type === 'churn') {
      // Para churn, baixo é bom
      if (probability < 30) return 'text-green-600';
      if (probability < 60) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      // Para outros, alto é bom
      if (probability > 70) return 'text-green-600';
      if (probability > 40) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  if (isLoading || processing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Análise Avançada de Clustering
          </CardTitle>
          <CardDescription>
            Processando análise estatística avançada dos dados...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Executando algoritmos de clustering...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!surveyData || surveyData.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Análise Avançada de Clustering
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Dados insuficientes para análise de clustering.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Necessário pelo menos 2 respostas para análise.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const insights = clusterResults ? generateClusterInsights(clusterResults, surveyData.length) : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Análise Avançada de Clustering
          </CardTitle>
          <CardDescription>
            Segmentação inteligente e modelos preditivos baseados em {surveyData.length} respostas
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="clustering" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clustering">Clustering</TabsTrigger>
          <TabsTrigger value="predictions">Modelos Preditivos</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="clustering" className="space-y-4">
          {clusterResults && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-primary">
                      {clusterResults.summary.totalClusters}
                    </div>
                    <p className="text-xs text-muted-foreground">Clusters Identificados</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {(clusterResults.silhouetteScore * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">Qualidade (Silhouette)</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {clusterResults.iterations}
                    </div>
                    <p className="text-xs text-muted-foreground">Iterações</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        clusterResults.summary.convergenceReached ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      <span className="text-sm font-medium">
                        {clusterResults.summary.convergenceReached ? 'Convergiu' : 'Parcial'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Status</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Segmentos Identificados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {clusterResults.clusterLabels.map((label, index) => {
                      const clusterSize = clusterResults.clusters[index]?.length / 
                        (clusterResults.clusters[0]?.length || 1) || 0;
                      const percentage = (clusterSize / surveyData.length) * 100;
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">Cluster {index + 1}</Badge>
                              <span className="font-medium">{label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={percentage} className="flex-1 h-2" />
                              <span className="text-sm text-muted-foreground min-w-[4rem]">
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
            {predictiveModels.map((model, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {getModelIcon(model.type)}
                    {getModelTitle(model.type)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getProbabilityColor(model.probability, model.type)}`}>
                        {model.probability}%
                      </div>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="text-sm text-muted-foreground">Confiança:</span>
                        <span className={`font-medium ${getConfidenceColor(model.confidence)}`}>
                          {(model.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Principais Fatores:</h4>
                      {model.factors.slice(0, 3).map((factor, factorIndex) => (
                        <div key={factorIndex} className="flex items-center justify-between">
                          <span className="text-sm">{factor.factor}</span>
                          <Badge 
                            variant={factor.importance === 'high' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {factor.importance === 'high' ? 'Alto' : 
                             factor.importance === 'medium' ? 'Médio' : 'Baixo'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Insights da Análise</CardTitle>
              <CardDescription>
                Descobertas e recomendações baseadas na análise dos dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2" />
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
                
                {insights.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum insight disponível no momento.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações de Análise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Número de Clusters (K)</label>
                  <div className="flex gap-2 mt-2">
                    {[2, 3, 4, 5].map(k => (
                      <Button
                        key={k}
                        variant={selectedK === k ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedK(k)}
                      >
                        {k}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Button onClick={performAnalysis} disabled={processing} className="w-full">
                  <RefreshCw className={`w-4 h-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
                  {processing ? 'Reprocessando...' : 'Reprocessar Análise'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedClusteringAnalysis;