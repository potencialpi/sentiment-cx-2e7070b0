import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  predicted?: boolean;
}

export interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  description?: string;
  showTrend?: boolean;
  showPrediction?: boolean;
  className?: string;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title = 'Análise de Séries Temporais',
  description = 'Tendências e previsões ao longo do tempo',
  showTrend = true,
  showPrediction = true,
  className = ''
}) => {
  if (!data || data.length === 0) {
    console.warn('TimeSeriesChart: data prop must be a non-empty array');
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Dados de série temporal não disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  // Separar dados históricos e previsões
  const historicalData = data.filter(d => !d.predicted);
  const predictionData = data.filter(d => d.predicted);

  // Calcular estatísticas
  const values = historicalData.map(d => d.value);
  const minValue = Math.min(...data.map(d => d.value));
  const maxValue = Math.max(...data.map(d => d.value));
  const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  // Calcular tendência
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const trendDirection = lastValue > firstValue ? 'up' : lastValue < firstValue ? 'down' : 'stable';
  const trendPercentage = ((lastValue - firstValue) / firstValue * 100).toFixed(1);

  // Função para normalizar valores para o gráfico (0-100)
  const normalizeValue = (value: number): number => {
    if (maxValue === minValue) return 50;
    return ((value - minValue) / (maxValue - minValue)) * 100;
  };

  // Criar pontos SVG
  const svgWidth = 800;
  const svgHeight = 300;
  const padding = 40;
  const chartWidth = svgWidth - 2 * padding;
  const chartHeight = svgHeight - 2 * padding;

  const createPath = (points: TimeSeriesDataPoint[], color: string, isDashed = false) => {
    if (points.length === 0) return null;
    
    const pathData = points.map((point, index) => {
      const x = padding + (index / (points.length - 1)) * chartWidth;
      const y = padding + (100 - normalizeValue(point.value)) / 100 * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={isDashed ? '5,5' : 'none'}
        className="transition-all duration-300"
      />
    );
  };

  const createPoints = (points: TimeSeriesDataPoint[], color: string) => {
    return points.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + (100 - normalizeValue(point.value)) / 100 * chartHeight;
      
      return (
        <g key={index}>
          <circle
            cx={x}
            cy={y}
            r="4"
            fill={color}
            className="hover:r-6 transition-all duration-200 cursor-pointer"
          />
          <title>{`${point.date}: ${point.value.toFixed(2)}`}</title>
        </g>
      );
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {trendDirection === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}
            {trendDirection === 'down' && <TrendingDown className="w-5 h-5 text-red-500" />}
            {trendDirection === 'stable' && <Minus className="w-5 h-5 text-gray-500" />}
            {title}
          </CardTitle>
          {showTrend && (
            <Badge 
              variant={trendDirection === 'up' ? 'default' : trendDirection === 'down' ? 'destructive' : 'secondary'}
            >
              {trendDirection === 'up' ? '+' : trendDirection === 'down' ? '' : ''}{trendPercentage}%
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Estatísticas resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{avgValue.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Média</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{maxValue.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Máximo</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{minValue.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Mínimo</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{historicalData.length}</div>
              <div className="text-xs text-muted-foreground">Pontos</div>
            </div>
          </div>

          {/* Gráfico SVG */}
          <div className="w-full overflow-x-auto">
            <svg width={svgWidth} height={svgHeight} className="border rounded-lg bg-white">
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Eixos */}
              <line x1={padding} y1={padding} x2={padding} y2={svgHeight - padding} stroke="#666" strokeWidth="2" />
              <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#666" strokeWidth="2" />
              
              {/* Labels do eixo Y */}
              <text x={padding - 10} y={padding + 5} textAnchor="end" className="text-xs fill-gray-600">
                {maxValue.toFixed(1)}
              </text>
              <text x={padding - 10} y={svgHeight - padding + 5} textAnchor="end" className="text-xs fill-gray-600">
                {minValue.toFixed(1)}
              </text>
              <text x={padding - 10} y={svgHeight / 2 + 5} textAnchor="end" className="text-xs fill-gray-600">
                {avgValue.toFixed(1)}
              </text>
              
              {/* Linha histórica */}
              {createPath(historicalData, '#3b82f6')}
              
              {/* Linha de previsão */}
              {showPrediction && predictionData.length > 0 && createPath(predictionData, '#f59e0b', true)}
              
              {/* Pontos históricos */}
              {createPoints(historicalData, '#3b82f6')}
              
              {/* Pontos de previsão */}
              {showPrediction && createPoints(predictionData, '#f59e0b')}
              
              {/* Linha de média */}
              <line 
                x1={padding} 
                y1={padding + (100 - normalizeValue(avgValue)) / 100 * chartHeight}
                x2={svgWidth - padding} 
                y2={padding + (100 - normalizeValue(avgValue)) / 100 * chartHeight}
                stroke="#ef4444" 
                strokeWidth="1" 
                strokeDasharray="3,3" 
                opacity="0.7"
              />
            </svg>
          </div>

          {/* Legenda */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500"></div>
              <span>Dados Históricos</span>
            </div>
            {showPrediction && predictionData.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-orange-500 border-dashed border-t-2 border-orange-500"></div>
                <span>Previsões</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500 opacity-70" style={{ borderTop: '1px dashed #ef4444' }}></div>
              <span>Média</span>
            </div>
          </div>

          {/* Insights automáticos */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Insights Automáticos</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Tendência geral: {trendDirection === 'up' ? 'Crescimento' : trendDirection === 'down' ? 'Declínio' : 'Estável'} de {Math.abs(parseFloat(trendPercentage))}%</li>
              <li>• Variação: {((maxValue - minValue) / avgValue * 100).toFixed(1)}% em relação à média</li>
              {predictionData.length > 0 && (
                <li>• Previsão: {predictionData.length} pontos futuros projetados</li>
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeSeriesChart;