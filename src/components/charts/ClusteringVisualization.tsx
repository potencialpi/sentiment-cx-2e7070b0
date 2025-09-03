import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Network, Target, BarChart3 } from 'lucide-react';

export interface ClusterPoint {
  id: string;
  x: number;
  y: number;
  cluster: number;
  label?: string;
}

export interface ClusterCentroid {
  x: number;
  y: number;
  cluster: number;
}

export interface ClusteringData {
  points: ClusterPoint[];
  centroids: ClusterCentroid[];
  silhouetteScore?: number;
  inertia?: number;
}

export interface ClusteringVisualizationProps {
  data: ClusteringData;
  title?: string;
  description?: string;
  className?: string;
}

const ClusteringVisualization: React.FC<ClusteringVisualizationProps> = ({
  data,
  title = 'Análise de Clustering K-Means',
  description = 'Segmentação automática de dados',
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('scatter');
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);

  if (!data || !data.points || data.points.length === 0) {
    console.warn('ClusteringVisualization: data prop must contain points array');
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Dados de clustering não disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  const { points, centroids, silhouetteScore, inertia } = data;
  
  // Cores para clusters
  const clusterColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ];

  // Calcular estatísticas dos clusters
  const clusterStats = centroids.map(centroid => {
    const clusterPoints = points.filter(p => p.cluster === centroid.cluster);
    return {
      cluster: centroid.cluster,
      count: clusterPoints.length,
      percentage: (clusterPoints.length / points.length * 100).toFixed(1),
      centroid
    };
  });

  // Normalizar coordenadas para o SVG
  const allX = points.map(p => p.x);
  const allY = points.map(p => p.y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  const normalizeX = (x: number) => ((x - minX) / (maxX - minX)) * 360 + 40;
  const normalizeY = (y: number) => ((maxY - y) / (maxY - minY)) * 260 + 40;

  const ScatterPlot = () => (
    <div className="space-y-4">
      <svg width="440" height="340" className="border rounded-lg bg-white">
        {/* Grid */}
        <defs>
          <pattern id="clusterGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#clusterGrid)" />
        
        {/* Pontos */}
        {points.map((point, index) => {
          const isSelected = selectedCluster === null || selectedCluster === point.cluster;
          return (
            <circle
              key={index}
              cx={normalizeX(point.x)}
              cy={normalizeY(point.y)}
              r={isSelected ? "6" : "3"}
              fill={clusterColors[point.cluster % clusterColors.length]}
              opacity={isSelected ? "0.8" : "0.3"}
              className="hover:r-8 transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedCluster(selectedCluster === point.cluster ? null : point.cluster)}
            >
              <title>{`Ponto ${point.id}: Cluster ${point.cluster}${point.label ? ` (${point.label})` : ''}`}</title>
            </circle>
          );
        })}
        
        {/* Centroides */}
        {centroids.map((centroid, index) => {
          const isSelected = selectedCluster === null || selectedCluster === centroid.cluster;
          return (
            <g key={index}>
              <circle
                cx={normalizeX(centroid.x)}
                cy={normalizeY(centroid.y)}
                r="8"
                fill="white"
                stroke={clusterColors[centroid.cluster % clusterColors.length]}
                strokeWidth="3"
                opacity={isSelected ? "1" : "0.5"}
                className="cursor-pointer"
                onClick={() => setSelectedCluster(selectedCluster === centroid.cluster ? null : centroid.cluster)}
              />
              <text
                x={normalizeX(centroid.x)}
                y={normalizeY(centroid.y) + 3}
                textAnchor="middle"
                className="text-xs font-bold fill-gray-700"
                opacity={isSelected ? "1" : "0.5"}
              >
                {centroid.cluster}
              </text>
            </g>
          );
        })}
      </svg>
      
      {/* Controles */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCluster === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCluster(null)}
        >
          Todos os Clusters
        </Button>
        {clusterStats.map(stat => (
          <Button
            key={stat.cluster}
            variant={selectedCluster === stat.cluster ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCluster(selectedCluster === stat.cluster ? null : stat.cluster)}
            style={{ 
              backgroundColor: selectedCluster === stat.cluster ? clusterColors[stat.cluster % clusterColors.length] : undefined,
              borderColor: clusterColors[stat.cluster % clusterColors.length]
            }}
          >
            Cluster {stat.cluster} ({stat.count})
          </Button>
        ))}
      </div>
    </div>
  );

  const ClusterStats = () => (
    <div className="space-y-4">
      {/* Métricas de qualidade */}
      <div className="grid grid-cols-2 gap-4">
        {silhouetteScore !== undefined && (
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{silhouetteScore.toFixed(3)}</div>
              <div className="text-sm text-muted-foreground">Silhouette Score</div>
              <div className="text-xs text-muted-foreground mt-1">
                {silhouetteScore > 0.7 ? 'Excelente' : 
                 silhouetteScore > 0.5 ? 'Bom' : 
                 silhouetteScore > 0.25 ? 'Razoável' : 'Ruim'}
              </div>
            </div>
          </Card>
        )}
        {inertia !== undefined && (
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{inertia.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Inércia</div>
              <div className="text-xs text-muted-foreground mt-1">Soma dos quadrados</div>
            </div>
          </Card>
        )}
      </div>

      {/* Estatísticas por cluster */}
      <div className="space-y-3">
        <h4 className="font-medium">Distribuição dos Clusters</h4>
        {clusterStats.map(stat => (
          <div key={stat.cluster} className="flex items-center gap-3 p-3 border rounded-lg">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: clusterColors[stat.cluster % clusterColors.length] }}
            ></div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">Cluster {stat.cluster}</span>
                <Badge variant="secondary">{stat.count} pontos</Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${stat.percentage}%`,
                    backgroundColor: clusterColors[stat.cluster % clusterColors.length]
                  }}
                ></div>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {stat.percentage}% dos dados
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const SilhouettePlot = () => (
    <div className="space-y-4">
      <div className="text-center py-8">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h4 className="font-medium mb-2">Gráfico de Silhueta</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Visualização da qualidade de cada cluster individual
        </p>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Interpretação:</strong><br/>
            • Valores próximos a +1: Pontos bem agrupados<br/>
            • Valores próximos a 0: Pontos na fronteira entre clusters<br/>
            • Valores próximos a -1: Pontos possivelmente mal classificados
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <div className="flex gap-2">
          <Badge variant="outline">{centroids.length} Clusters</Badge>
          <Badge variant="outline">{points.length} Pontos</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scatter">Dispersão</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            <TabsTrigger value="silhouette">Silhueta</TabsTrigger>
          </TabsList>
          
          <TabsContent value="scatter" className="space-y-4">
            <ScatterPlot />
          </TabsContent>
          
          <TabsContent value="stats" className="space-y-4">
            <ClusterStats />
          </TabsContent>
          
          <TabsContent value="silhouette" className="space-y-4">
            <SilhouettePlot />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ClusteringVisualization;