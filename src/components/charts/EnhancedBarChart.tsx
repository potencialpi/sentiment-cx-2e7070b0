/**
 * Componente de gráfico de barras aprimorado
 * Mantém compatibilidade com Recharts mas adiciona recursos interativos
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

export interface BarChartDataItem {
  name: string;
  value: number;
  category?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export interface EnhancedBarChartProps {
  data: BarChartDataItem[];
  title?: string;
  subtitle?: string;
  height?: number;
  showLegend?: boolean;
  showTrend?: boolean;
  enableSort?: boolean;
  enableFilter?: boolean;
  enableExport?: boolean;
  colorScheme?: 'default' | 'gradient' | 'categorical' | 'sentiment';
  orientation?: 'vertical' | 'horizontal';
  showValues?: boolean;
  animationDuration?: number;
  onBarClick?: (data: BarChartDataItem, index: number) => void;
  className?: string;
}

type SortOrder = 'asc' | 'desc' | 'original';
type FilterCategory = 'all' | string;

const COLOR_SCHEMES = {
  default: ['hsl(var(--primary))', 'hsl(var(--primary) / 0.8)', 'hsl(var(--primary) / 0.6)'],
  gradient: [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  ],
  categorical: [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
    '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
  ],
  sentiment: {
    positive: '#10b981', // green-500
    neutral: '#6b7280',  // gray-500
    negative: '#ef4444'  // red-500
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valor:</span>
            <span className="font-medium text-foreground">{payload[0].value}</span>
          </div>
          {data.category && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Categoria:</span>
              <Badge variant="secondary" className="text-xs">{data.category}</Badge>
            </div>
          )}
          {data.metadata && Object.entries(data.metadata).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground capitalize">{key}:</span>
              <span className="text-sm font-medium">{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const CustomLabel = ({ x, y, width, height, value, orientation }: any) => {
  if (orientation === 'horizontal') {
    return (
      <text
        x={x + width + 5}
        y={y + height / 2}
        fill="hsl(var(--muted-foreground))"
        textAnchor="start"
        dominantBaseline="middle"
        fontSize={12}
        fontWeight={500}
      >
        {value}
      </text>
    );
  }
  
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill="hsl(var(--muted-foreground))"
      textAnchor="middle"
      dominantBaseline="bottom"
      fontSize={12}
      fontWeight={500}
    >
      {value}
    </text>
  );
};

export const EnhancedBarChart: React.FC<EnhancedBarChartProps> = ({
  data,
  title,
  subtitle,
  height = 400,
  showLegend = false,
  showTrend = true,
  enableSort = true,
  enableFilter = true,
  enableExport = true,
  colorScheme = 'default',
  orientation = 'vertical',
  showValues = false,
  animationDuration = 1000,
  onBarClick,
  className = ''
}) => {
  const [sortOrder, setSortOrder] = useState<SortOrder>('original');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Processar dados com filtros e ordenação
  const processedData = useMemo(() => {
    // Garantir que data seja sempre um array
    const safeData = Array.isArray(data) ? data : [];
    let filtered = safeData;
    
    // Aplicar filtro por categoria
    if (filterCategory !== 'all') {
      filtered = safeData.filter(item => item.category === filterCategory);
    }
    
    // Aplicar ordenação
    if (sortOrder === 'asc') {
      filtered = [...filtered].sort((a, b) => a.value - b.value);
    } else if (sortOrder === 'desc') {
      filtered = [...filtered].sort((a, b) => b.value - a.value);
    }
    
    return filtered;
  }, [data, sortOrder, filterCategory]);

  // Obter categorias únicas para filtro
  const categories = useMemo(() => {
    // Garantir que data seja sempre um array
    const safeData = Array.isArray(data) ? data : [];
    const cats = new Set(safeData.map(item => item.category).filter(Boolean));
    return Array.from(cats);
  }, [data]);

  // Calcular estatísticas de tendência
  const trendStats = useMemo(() => {
    // Garantir que processedData seja sempre um array
    const safeProcessedData = Array.isArray(processedData) ? processedData : [];
    if (safeProcessedData.length < 2) return null;
    
    const values = safeProcessedData.map(item => item.value);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    // Calcular tendência simples (comparar primeira metade com segunda metade)
    const midPoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midPoint);
    const secondHalf = values.slice(midPoint);
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const trend = secondAvg > firstAvg ? 'up' : secondAvg < firstAvg ? 'down' : 'stable';
    const trendPercentage = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
    
    return {
      total,
      average: Math.round(average * 100) / 100,
      max,
      min,
      trend,
      trendPercentage: Math.round(trendPercentage * 100) / 100
    };
  }, [processedData]);

  // Obter cores baseadas no esquema
  const getBarColor = (item: BarChartDataItem, index: number) => {
    if (item.color) return item.color;
    
    switch (colorScheme) {
      case 'categorical':
        return COLOR_SCHEMES.categorical[index % COLOR_SCHEMES.categorical.length];
      case 'sentiment':
        if (item.category && item.category in COLOR_SCHEMES.sentiment) {
          return COLOR_SCHEMES.sentiment[item.category as keyof typeof COLOR_SCHEMES.sentiment];
        }
        return COLOR_SCHEMES.default[0];
      case 'gradient':
        return `url(#gradient-${index})`;
      default:
        return hoveredIndex === index 
          ? 'hsl(var(--primary) / 0.8)' 
          : 'hsl(var(--primary))';
    }
  };

  // Função de exportação
  const handleExport = (format: 'csv' | 'json') => {
    // Garantir que processedData seja sempre um array
    const safeProcessedData = Array.isArray(processedData) ? processedData : [];
    const exportData = safeProcessedData.map(item => ({
      nome: item.name,
      valor: item.value,
      categoria: item.category || 'N/A',
      ...item.metadata
    }));
    
    if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(header => row[header as keyof typeof row]).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'chart-data'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'chart-data'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleBarClick = (data: any, index: number) => {
    if (onBarClick) {
      onBarClick(data, index);
    }
  };

  return (
    <Card className={`shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              {title && <CardTitle className="text-lg font-semibold">{title}</CardTitle>}
              {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Estatísticas de tendência */}
            {showTrend && trendStats && (
              <div className="flex items-center gap-2 mr-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  {trendStats.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                  {trendStats.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                  {trendStats.trend === 'stable' && <Minus className="h-3 w-3 text-gray-500" />}
                  <span className="text-xs">
                    {trendStats.trend === 'stable' ? 'Estável' : `${Math.abs(trendStats.trendPercentage)}%`}
                  </span>
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Média: {trendStats.average}
                </Badge>
              </div>
            )}
            
            {/* Controles */}
            <div className="flex items-center gap-1">
              {/* Filtro por categoria */}
              {enableFilter && categories.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      <Filter className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilterCategory('all')}>
                      Todas as categorias
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {categories.map(category => (
                      <DropdownMenuItem 
                        key={category} 
                        onClick={() => setFilterCategory(category)}
                      >
                        {category}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Ordenação */}
              {enableSort && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      {sortOrder === 'asc' && <SortAsc className="h-3 w-3" />}
                      {sortOrder === 'desc' && <SortDesc className="h-3 w-3" />}
                      {sortOrder === 'original' && <BarChart3 className="h-3 w-3" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortOrder('original')}>
                      Ordem original
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOrder('asc')}>
                      Crescente
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOrder('desc')}>
                      Decrescente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Exportação */}
              {enableExport && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      <Download className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('csv')}>
                      Exportar CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('json')}>
                      Exportar JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={Array.isArray(processedData) ? processedData : []}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              layout={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--muted-foreground) / 0.2)" 
              />
              
              {orientation === 'vertical' ? (
                <>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--muted-foreground) / 0.3)' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--muted-foreground) / 0.3)' }}
                  />
                </>
              ) : (
                <>
                  <XAxis 
                    type="number"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--muted-foreground) / 0.3)' }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--muted-foreground) / 0.3)' }}
                  />
                </>
              )}
              
              <Tooltip content={<CustomTooltip />} />
              
              {showLegend && <Legend />}
              
              <Bar 
                dataKey="value" 
                radius={[4, 4, 0, 0]}
                onClick={handleBarClick}
                onMouseEnter={(_, index) => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                animationDuration={animationDuration}
                label={showValues ? <CustomLabel orientation={orientation} /> : undefined}
              >
                {(Array.isArray(processedData) ? processedData : []).map((item, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(item, index)}
                    stroke={hoveredIndex === index ? 'hsl(var(--primary))' : 'transparent'}
                    strokeWidth={hoveredIndex === index ? 2 : 0}
                  />
                ))}
              </Bar>
              
              {/* Gradientes para esquema gradient */}
              {colorScheme === 'gradient' && (
                <defs>
                  {(Array.isArray(processedData) ? processedData : []).map((_, index) => (
                    <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
                    </linearGradient>
                  ))}
                </defs>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Informações adicionais */}
        {trendStats && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Total</p>
                <p className="font-semibold text-foreground">{trendStats.total}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Média</p>
                <p className="font-semibold text-foreground">{trendStats.average}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Máximo</p>
                <p className="font-semibold text-foreground">{trendStats.max}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Mínimo</p>
                <p className="font-semibold text-foreground">{trendStats.min}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedBarChart;