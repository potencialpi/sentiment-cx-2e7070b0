import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

export interface ANOVAGroup {
  name: string;
  values: number[];
  mean: number;
  std: number;
  count: number;
}

export interface ANOVAResult {
  fStatistic: number;
  pValue: number;
  dfBetween: number;
  dfWithin: number;
  msBetween: number;
  msWithin: number;
  significant: boolean;
}

export interface ANOVAData {
  groups: ANOVAGroup[];
  result: ANOVAResult;
  alpha?: number;
}

export interface ANOVAChartProps {
  data: ANOVAData;
  title?: string;
  description?: string;
  className?: string;
}

const ANOVAChart: React.FC<ANOVAChartProps> = ({
  data,
  title = 'Análise ANOVA',
  description = 'Comparação de múltiplos grupos',
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('boxplot');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  if (!data || !data.groups || data.groups.length === 0) {
    console.warn('ANOVAChart: data prop must contain groups array');
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Dados de ANOVA não disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  const { groups, result, alpha = 0.05 } = data;
  
  // Cores para grupos
  const groupColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ];

  // Calcular estatísticas globais
  const allValues = groups.flatMap(g => g.values);
  const globalMean = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);

  // Função para calcular quartis
  const calculateQuartiles = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q2Index = Math.floor(sorted.length * 0.5);
    const q3Index = Math.floor(sorted.length * 0.75);
    
    return {
      q1: sorted[q1Index],
      q2: sorted[q2Index], // mediana
      q3: sorted[q3Index],
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  };

  const BoxPlot = () => {
    const svgWidth = 600;
    const svgHeight = 400;
    const padding = 60;
    const chartWidth = svgWidth - 2 * padding;
    const chartHeight = svgHeight - 2 * padding;
    const boxWidth = chartWidth / groups.length * 0.6;
    
    const normalizeY = (value: number) => {
      return padding + (1 - (value - minValue) / (maxValue - minValue)) * chartHeight;
    };

    return (
      <div className="space-y-4">
        <svg width={svgWidth} height={svgHeight} className="border rounded-lg bg-white">
          {/* Grid lines */}
          <defs>
            <pattern id="anovaGrid" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#anovaGrid)" />
          
          {/* Eixos */}
          <line x1={padding} y1={padding} x2={padding} y2={svgHeight - padding} stroke="#666" strokeWidth="2" />
          <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#666" strokeWidth="2" />
          
          {/* Labels do eixo Y */}
          <text x={padding - 10} y={normalizeY(maxValue) + 5} textAnchor="end" className="text-xs fill-gray-600">
            {maxValue.toFixed(1)}
          </text>
          <text x={padding - 10} y={normalizeY(minValue) + 5} textAnchor="end" className="text-xs fill-gray-600">
            {minValue.toFixed(1)}
          </text>
          <text x={padding - 10} y={normalizeY(globalMean) + 5} textAnchor="end" className="text-xs fill-gray-600">
            {globalMean.toFixed(1)}
          </text>
          
          {/* Linha da média global */}
          <line 
            x1={padding} 
            y1={normalizeY(globalMean)}
            x2={svgWidth - padding} 
            y2={normalizeY(globalMean)}
            stroke="#ef4444" 
            strokeWidth="1" 
            strokeDasharray="5,5" 
            opacity="0.7"
          />
          
          {/* Box plots */}
          {groups.map((group, index) => {
            const quartiles = calculateQuartiles(group.values);
            const centerX = padding + (index + 0.5) * (chartWidth / groups.length);
            const isSelected = selectedGroups.length === 0 || selectedGroups.includes(group.name);
            const opacity = isSelected ? 1 : 0.3;
            const color = groupColors[index % groupColors.length];
            
            return (
              <g key={index} opacity={opacity}>
                {/* Box */}
                <rect
                  x={centerX - boxWidth / 2}
                  y={normalizeY(quartiles.q3)}
                  width={boxWidth}
                  height={normalizeY(quartiles.q1) - normalizeY(quartiles.q3)}
                  fill={color}
                  fillOpacity="0.3"
                  stroke={color}
                  strokeWidth="2"
                  className="cursor-pointer"
                  onClick={() => {
                    if (selectedGroups.includes(group.name)) {
                      setSelectedGroups(selectedGroups.filter(g => g !== group.name));
                    } else {
                      setSelectedGroups([...selectedGroups, group.name]);
                    }
                  }}
                />
                
                {/* Mediana */}
                <line
                  x1={centerX - boxWidth / 2}
                  y1={normalizeY(quartiles.q2)}
                  x2={centerX + boxWidth / 2}
                  y2={normalizeY(quartiles.q2)}
                  stroke={color}
                  strokeWidth="3"
                />
                
                {/* Whiskers */}
                <line
                  x1={centerX}
                  y1={normalizeY(quartiles.q3)}
                  x2={centerX}
                  y2={normalizeY(quartiles.max)}
                  stroke={color}
                  strokeWidth="2"
                />
                <line
                  x1={centerX}
                  y1={normalizeY(quartiles.q1)}
                  x2={centerX}
                  y2={normalizeY(quartiles.min)}
                  stroke={color}
                  strokeWidth="2"
                />
                
                {/* Caps */}
                <line
                  x1={centerX - boxWidth / 4}
                  y1={normalizeY(quartiles.max)}
                  x2={centerX + boxWidth / 4}
                  y2={normalizeY(quartiles.max)}
                  stroke={color}
                  strokeWidth="2"
                />
                <line
                  x1={centerX - boxWidth / 4}
                  y1={normalizeY(quartiles.min)}
                  x2={centerX + boxWidth / 4}
                  y2={normalizeY(quartiles.min)}
                  stroke={color}
                  strokeWidth="2"
                />
                
                {/* Média do grupo */}
                <circle
                  cx={centerX}
                  cy={normalizeY(group.mean)}
                  r="4"
                  fill="white"
                  stroke={color}
                  strokeWidth="2"
                />
                
                {/* Label do grupo */}
                <text
                  x={centerX}
                  y={svgHeight - padding + 20}
                  textAnchor="middle"
                  className="text-sm font-medium fill-gray-700"
                >
                  {group.name}
                </text>
              </g>
            );
          })}
        </svg>
        
        {/* Controles */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedGroups.length === 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedGroups([])}
          >
            Todos os Grupos
          </Button>
          {groups.map((group, index) => (
            <Button
              key={group.name}
              variant={selectedGroups.includes(group.name) ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (selectedGroups.includes(group.name)) {
                  setSelectedGroups(selectedGroups.filter(g => g !== group.name));
                } else {
                  setSelectedGroups([...selectedGroups, group.name]);
                }
              }}
              style={{ 
                backgroundColor: selectedGroups.includes(group.name) ? groupColors[index % groupColors.length] : undefined,
                borderColor: groupColors[index % groupColors.length]
              }}
            >
              {group.name} (n={group.count})
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const StatisticsTable = () => (
    <div className="space-y-4">
      {/* Resultado do teste ANOVA */}
      <Card className={`p-4 ${result.significant ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
        <div className="flex items-center gap-2 mb-3">
          {result.significant ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
          <h4 className={`font-medium ${result.significant ? 'text-red-900' : 'text-green-900'}`}>
            {result.significant ? 'Diferença Significativa Detectada' : 'Nenhuma Diferença Significativa'}
          </h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold">{result.fStatistic.toFixed(3)}</div>
            <div className="text-xs text-muted-foreground">Estatística F</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${result.pValue < alpha ? 'text-red-600' : 'text-green-600'}`}>
              {result.pValue.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">Valor p</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{result.dfBetween}</div>
            <div className="text-xs text-muted-foreground">GL Entre</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{result.dfWithin}</div>
            <div className="text-xs text-muted-foreground">GL Dentro</div>
          </div>
        </div>
      </Card>

      {/* Estatísticas por grupo */}
      <div className="space-y-3">
        <h4 className="font-medium">Estatísticas Descritivas por Grupo</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 p-2 text-left">Grupo</th>
                <th className="border border-gray-200 p-2 text-center">N</th>
                <th className="border border-gray-200 p-2 text-center">Média</th>
                <th className="border border-gray-200 p-2 text-center">Desvio Padrão</th>
                <th className="border border-gray-200 p-2 text-center">Min</th>
                <th className="border border-gray-200 p-2 text-center">Max</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, index) => {
                const quartiles = calculateQuartiles(group.values);
                return (
                  <tr key={group.name} className="hover:bg-gray-50">
                    <td className="border border-gray-200 p-2 font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: groupColors[index % groupColors.length] }}
                        ></div>
                        {group.name}
                      </div>
                    </td>
                    <td className="border border-gray-200 p-2 text-center">{group.count}</td>
                    <td className="border border-gray-200 p-2 text-center">{group.mean.toFixed(2)}</td>
                    <td className="border border-gray-200 p-2 text-center">{group.std.toFixed(2)}</td>
                    <td className="border border-gray-200 p-2 text-center">{quartiles.min.toFixed(2)}</td>
                    <td className="border border-gray-200 p-2 text-center">{quartiles.max.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const Interpretation = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Interpretação dos Resultados</h4>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>Hipótese Nula (H₀):</strong> Todas as médias dos grupos são iguais</p>
          <p><strong>Hipótese Alternativa (H₁):</strong> Pelo menos uma média é diferente</p>
          <p><strong>Nível de Significância (α):</strong> {alpha}</p>
          
          <div className="mt-3 p-3 bg-white rounded border">
            <p className="font-medium mb-1">Conclusão:</p>
            {result.significant ? (
              <p className="text-red-700">
                Com p-valor = {result.pValue.toFixed(4)} &lt; α = {alpha}, rejeitamos H₀. 
                Há evidência estatística de que pelo menos um grupo tem média significativamente diferente dos demais.
              </p>
            ) : (
              <p className="text-green-700">
                Com p-valor = {result.pValue.toFixed(4)} ≥ α = {alpha}, não rejeitamos H₀. 
                Não há evidência estatística suficiente para afirmar que as médias dos grupos são diferentes.
              </p>
            )}
          </div>
        </div>
      </div>
      
      {result.significant && (
        <div className="bg-orange-50 p-4 rounded-lg">
          <h4 className="font-medium text-orange-900 mb-2">Próximos Passos Recomendados</h4>
          <div className="text-sm text-orange-800 space-y-1">
            <p>• Realizar testes post-hoc (ex: Tukey HSD) para identificar quais grupos diferem</p>
            <p>• Verificar pressupostos da ANOVA (normalidade, homogeneidade de variâncias)</p>
            <p>• Considerar o tamanho do efeito (eta-quadrado) para avaliar significância prática</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <div className="flex gap-2">
          <Badge variant={result.significant ? "destructive" : "default"}>
            {result.significant ? 'Significativo' : 'Não Significativo'}
          </Badge>
          <Badge variant="outline">{groups.length} Grupos</Badge>
          <Badge variant="outline">F = {result.fStatistic.toFixed(2)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="boxplot">Box Plot</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
            <TabsTrigger value="interpretation">Interpretação</TabsTrigger>
          </TabsList>
          
          <TabsContent value="boxplot" className="space-y-4">
            <BoxPlot />
          </TabsContent>
          
          <TabsContent value="stats" className="space-y-4">
            <StatisticsTable />
          </TabsContent>
          
          <TabsContent value="interpretation" className="space-y-4">
            <Interpretation />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ANOVAChart;