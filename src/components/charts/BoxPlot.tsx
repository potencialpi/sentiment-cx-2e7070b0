import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { identifyOutliers, calculatePercentile } from '@/utils/statisticalAnalysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export interface BoxPlotData {
  name: string;
  values: number[];
  color?: string;
}

export interface BoxPlotProps {
  data: BoxPlotData[];
  title?: string;
  description?: string;
  height?: number;
  showOutliers?: boolean;
  showStatistics?: boolean;
  className?: string;
}

const BoxPlot: React.FC<BoxPlotProps> = ({
  data,
  title = 'Análise de Distribuição',
  description = 'Boxplot para identificação de outliers e análise de distribuição',
  height = 400,
  showOutliers = true,
  showStatistics = true,
  className = ''
}) => {
  const { chartData, outlierStats, chartOptions } = useMemo(() => {
    // Validar se data é um array
    if (!Array.isArray(data)) {
      console.warn('BoxPlot: data prop must be an array, received:', typeof data);
      return {
        chartData: [],
        outlierStats: [],
        chartOptions: {} as ApexOptions
      };
    }

    // Preparar dados para o boxplot
    const boxplotSeries = data.map(item => {
      const values = item.values.filter(v => !isNaN(v) && isFinite(v));
      
      if (values.length === 0) {
        return {
          x: item.name,
          y: [0, 0, 0, 0, 0] // min, q1, median, q3, max
        };
      }

      const sorted = [...values].sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const q1 = calculatePercentile(values, 25);
      const median = calculatePercentile(values, 50);
      const q3 = calculatePercentile(values, 75);

      return {
        x: item.name,
        y: [min, q1, median, q3, max]
      };
    });

    // Calcular estatísticas de outliers
    const outlierStats = data.map(item => {
      const outlierData = identifyOutliers(item.values);
      return {
        name: item.name,
        ...outlierData
      };
    });

    // Configurações do gráfico
    const options: ApexOptions = {
      chart: {
        type: 'boxPlot',
        height: height,
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
        }
      },
      title: {
        text: title,
        align: 'left',
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937'
        }
      },
      plotOptions: {
        boxPlot: {
          colors: {
            upper: '#3b82f6',
            lower: '#60a5fa'
          }
        }
      },
      xaxis: {
        type: 'category',
        title: {
          text: 'Categorias',
          style: {
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280'
          }
        },
        labels: {
          style: {
            fontSize: '11px',
            colors: '#6b7280'
          }
        }
      },
      yaxis: {
        title: {
          text: 'Valores',
          style: {
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280'
          }
        },
        labels: {
          style: {
            fontSize: '11px',
            colors: '#6b7280'
          },
          formatter: (value: number) => {
            return typeof value === 'number' ? value.toFixed(1) : '0';
          }
        }
      },
      grid: {
        show: true,
        borderColor: '#f3f4f6',
        strokeDashArray: 3,
        xaxis: {
          lines: {
            show: false
          }
        },
        yaxis: {
          lines: {
            show: true
          }
        }
      },
      tooltip: {
        shared: false,
        intersect: true,
        custom: function({ seriesIndex, dataPointIndex, w }) {
          const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
          const [min, q1, median, q3, max] = data.y;
          
          return `
            <div class="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
              <div class="font-semibold text-gray-800 mb-2">${data.x}</div>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Máximo:</span>
                  <span class="font-medium">${max.toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Q3 (75%):</span>
                  <span class="font-medium">${q3.toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Mediana:</span>
                  <span class="font-medium">${median.toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Q1 (25%):</span>
                  <span class="font-medium">${q1.toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Mínimo:</span>
                  <span class="font-medium">${min.toFixed(2)}</span>
                </div>
              </div>
            </div>
          `;
        }
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: {
              height: 300
            },
            title: {
              style: {
                fontSize: '14px'
              }
            }
          }
        },
        {
          breakpoint: 480,
          options: {
            chart: {
              height: 250
            },
            title: {
              style: {
                fontSize: '12px'
              }
            }
          }
        }
      ]
    };

    return {
      chartData: [{
        name: 'Distribuição',
        type: 'boxPlot',
        data: boxplotSeries
      }],
      outlierStats,
      chartOptions: options
    };
  }, [data, title, height]);

  const totalOutliers = outlierStats.reduce((sum, stat) => sum + stat.outliers.length, 0);

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              {description}
            </CardDescription>
          </div>
          {showOutliers && totalOutliers > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {totalOutliers} outlier{totalOutliers !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <Chart
            options={chartOptions}
            series={chartData}
            type="boxPlot"
            height={height}
          />
        </div>
        
        {showStatistics && (
          <div className="mt-6 space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Estatísticas Detalhadas
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {outlierStats.map((stat, index) => (
                <div key={stat.name} className="bg-gray-50 rounded-lg p-3">
                  <h5 className="font-medium text-gray-800 mb-2">{stat.name}</h5>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>IQR:</span>
                      <span className="font-medium">{stat.iqr.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Q1:</span>
                      <span className="font-medium">{stat.q1.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Q3:</span>
                      <span className="font-medium">{stat.q3.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Limite Inferior:</span>
                      <span className="font-medium">{stat.lowerBound.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Limite Superior:</span>
                      <span className="font-medium">{stat.upperBound.toFixed(2)}</span>
                    </div>
                    {stat.outliers.length > 0 && (
                      <div className="pt-1 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-red-600">Outliers:</span>
                          <Badge variant="destructive" size="sm">
                            {stat.outliers.length}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-red-600">
                          {stat.outliers.slice(0, 3).map(outlier => outlier.toFixed(1)).join(', ')}
                          {stat.outliers.length > 3 && '...'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BoxPlot;