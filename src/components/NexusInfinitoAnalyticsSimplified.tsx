import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Activity, 
  TrendingUp, 
  BarChart3, 
  Target,
  RefreshCw,
  Sparkles,
  Network,
  Atom
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { calculateStatisticalSummary, calculateCorrelation, identifyOutliers } from '@/utils/statisticalAnalysis';
import ClusteringTab from '@/components/ClusteringTab';
import CorrelationMatrix from '@/components/charts/CorrelationMatrix';
import TimeSeriesChart from '@/components/charts/TimeSeriesChart';
import ANOVAChart from '@/components/charts/ANOVAChart';

interface NexusAnalyticsProps {
  surveyId: string;
}

export const NexusInfinitoAnalyticsSimplified: React.FC<NexusAnalyticsProps> = ({ surveyId }) => {
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('clustering');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (surveyId) {
      loadSurveyData();
    }
  }, [surveyId]);

  const loadSurveyData = async () => {
    setLoading(true);
    try {
      const { data: responsesData, error } = await supabase
        .from('responses')
        .select('*')
        .eq('survey_id', surveyId);

      if (error) throw error;

      setResponses(responsesData || []);
      
      // Calcular estatísticas básicas
      if (responsesData && responsesData.length > 0) {
        const sentimentScores = responsesData
          .map(r => r.sentiment_score || 0)
          .filter(score => !isNaN(score));
        
        if (sentimentScores.length > 0) {
          const statistics = calculateStatisticalSummary(sentimentScores);
          setStats(statistics);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Total de Respostas</span>
          </div>
          <div className="text-2xl font-bold mt-2">{responses.length}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">Score Médio</span>
          </div>
          <div className="text-2xl font-bold mt-2">
            {stats ? stats.mean.toFixed(2) : '0.00'}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">Desvio Padrão</span>
          </div>
          <div className="text-2xl font-bold mt-2">
            {stats ? stats.standardDeviation.toFixed(2) : '0.00'}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium">Mediana</span>
          </div>
          <div className="text-2xl font-bold mt-2">
            {stats ? stats.median.toFixed(2) : '0.00'}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStatistics = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Atom className="w-5 h-5" />
            Estatísticas Descritivas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-medium">Tendência Central</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Média:</span>
                    <span className="font-mono">{stats.mean.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mediana:</span>
                    <span className="font-mono">{stats.median.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Moda:</span>
                    <span className="font-mono">
                      {Array.isArray(stats.mode) ? stats.mode.join(', ') : stats.mode.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Dispersão</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Desvio Padrão:</span>
                    <span className="font-mono">{stats.standardDeviation.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Variância:</span>
                    <span className="font-mono">{stats.variance.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amplitude:</span>
                    <span className="font-mono">{stats.range.toFixed(3)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Percentis</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>P25:</span>
                    <span className="font-mono">{stats.percentiles.p25.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>P75:</span>
                    <span className="font-mono">{stats.percentiles.p75.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>P90:</span>
                    <span className="font-mono">{stats.percentiles.p90.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Dados insuficientes para análise estatística.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderPredictive = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Modelos Preditivos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Modelos preditivos avançados em desenvolvimento.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Funcionalidade será implementada em breve.
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-6 h-6" />
            Nexus Infinito Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Carregando análises avançadas...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-6 h-6" />
            Nexus Infinito Analytics
            <Badge variant="secondary" className="ml-2">Avançado</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderOverview()}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clustering">Clustering</TabsTrigger>
          <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
          <TabsTrigger value="predictive">Preditivo</TabsTrigger>
          <TabsTrigger value="advanced">Avançado</TabsTrigger>
        </TabsList>

        <TabsContent value="clustering" className="space-y-4">
          <ClusteringTab responses={responses} loading={loading} />
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          {renderStatistics()}
        </TabsContent>

        <TabsContent value="predictive" className="space-y-4">
          {renderPredictive()}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Funcionalidades Avançadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Análise de Correlação</h4>
                  <p className="text-sm text-muted-foreground">
                    Identifica relações entre variáveis dos dados.
                  </p>
                  <CorrelationMatrix 
                    data={{
                      variables: ['Satisfação', 'Qualidade', 'Preço', 'Atendimento'],
                      matrix: [
                        [1.00, 0.75, -0.32, 0.68],
                        [0.75, 1.00, -0.28, 0.72],
                        [-0.32, -0.28, 1.00, -0.15],
                        [0.68, 0.72, -0.15, 1.00]
                      ]
                    }}
                    className="mt-2"
                  />
                </Card>
                
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Detecção de Outliers</h4>
                  <p className="text-sm text-muted-foreground">
                    Identifica valores atípicos nos dados.
                  </p>
                  <Button size="sm" className="mt-2" disabled>
                    Em Breve
                  </Button>
                </Card>
                
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Análise Temporal</h4>
                  <p className="text-sm text-muted-foreground">
                    Analisa tendências ao longo do tempo.
                  </p>
                  <TimeSeriesChart 
                    data={[
                      { date: '2024-01', value: 4.2, predicted: false },
                      { date: '2024-02', value: 4.5, predicted: false },
                      { date: '2024-03', value: 4.1, predicted: false },
                      { date: '2024-04', value: 4.7, predicted: false },
                      { date: '2024-05', value: 4.3, predicted: false },
                      { date: '2024-06', value: 4.8, predicted: true },
                      { date: '2024-07', value: 4.9, predicted: true }
                    ]}
                    className="mt-2"
                  />
                </Card>
                
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Machine Learning</h4>
                  <p className="text-sm text-muted-foreground">
                    Modelos de aprendizado de máquina personalizados.
                  </p>
                  <Button size="sm" className="mt-2" disabled>
                    Em Breve
                  </Button>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NexusInfinitoAnalyticsSimplified;