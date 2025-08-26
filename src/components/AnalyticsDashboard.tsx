import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useSurveyAnalytics } from '@/hooks/useSurveyAnalytics';
import { BarChart3, TrendingUp, Download, Users, MessageSquare, Brain, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getUserPlan } from '@/lib/planUtils';
// Recharts removido - agora usando apenas ApexCharts
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import VortexNeuralAnalytics from './VortexNeuralAnalytics';
import NexusInfinitoAnalytics from './NexusInfinitoAnalytics';
import StartQuanticoAnalytics from './StartQuanticoAnalytics';

interface AnalyticsDashboardProps {
  surveyId: string;
  className?: string;
  accountType?: 'basic' | 'premium' | 'vortex-neural' | 'nexus-infinito' | 'start-quantico';
}

// Modern vibrant color palette - highly saturated and impactful
const COLORS = [
  '#FF0080', '#00FFFF', '#FF4000', '#8000FF', '#00FF80',
  '#FFFF00', '#FF8000', '#0080FF', '#FF0040', '#40FF00'
];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  surveyId, 
  className = '',
  accountType: propAccountType = 'basic'
}) => {
  const { analytics, loading, error, refreshAnalytics } = useSurveyAnalytics(surveyId);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [accountType, setAccountType] = useState<'basic' | 'premium' | 'vortex-neural' | 'nexus-infinito' | 'start-quantico'>(propAccountType);
  const [userPlanLoading, setUserPlanLoading] = useState(true);

  // Detect user plan and set account type
  useEffect(() => {
    const detectUserPlan = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const userPlan = await getUserPlan(supabase, user.id);
          console.log('Detected user plan:', userPlan);
          
          if (userPlan === 'vortex-neural') {
            setAccountType('vortex-neural');
          } else if (userPlan === 'nexus-infinito') {
            setAccountType('nexus-infinito');
          } else if (userPlan === 'start-quantico') {
            setAccountType('start-quantico');
          } else {
            setAccountType('basic');
          }
        }
      } catch (error) {
        console.error('Error detecting user plan:', error);
        setAccountType(propAccountType);
      } finally {
        setUserPlanLoading(false);
      }
    };

    detectUserPlan();
  }, [propAccountType]);

  const exportData = useCallback((format: 'csv' | 'json') => {
    if (!analytics) return;

    const data = {
      survey: {
        totalResponses: analytics.totalResponses,
        averageRating: analytics.averageRating,
        completionRate: analytics.completionRate
      },
      questions: analytics.questions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        responses: q.responses,
        statistics: q.statistics
      })),
      sentimentOverview: analytics.sentimentOverview,
      responsesByDate: analytics.responsesByDate
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `analytics-survey-${surveyId}-${new Date().toISOString().split('T')[0]}.json`;
      downloadLink.click();
      URL.revokeObjectURL(downloadUrl);
    } else if (format === 'csv') {
      const csvData = analytics.questions.map(q => ({
        'ID da Questão': q.id,
        'Texto da Questão': q.text,
        'Tipo': q.type,
        'Total de Respostas': q.statistics.totalResponses,
        'Sentimento Positivo': q.statistics.sentimentBreakdown?.positive || 0,
        'Sentimento Neutro': q.statistics.sentimentBreakdown?.neutral || 0,
        'Sentimento Negativo': q.statistics.sentimentBreakdown?.negative || 0,
        'Média de Rating': q.statistics.averageRating || 0,
        'Resposta Mais Comum': q.statistics.mostCommonAnswer || 'N/A'
      }));

      const csvContent = [
        Object.keys(csvData[0] || {}).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `analytics-survey-${surveyId}-${new Date().toISOString().split('T')[0]}.csv`;
      downloadLink.click();
      URL.revokeObjectURL(downloadUrl);
    }

    toast({
      title: "Sucesso",
      description: `Dados exportados em formato ${format.toUpperCase()}`
    });
  }, [analytics, surveyId]);

  // Precompute memoized data
  const selectedQuestionData = useMemo(() => {
    return analytics?.questions.find(q => q.id === selectedQuestion);
  }, [analytics?.questions, selectedQuestion]);

  const sentimentOverviewData = useMemo(() => {
    if (!analytics) return { series: [], labels: [] };
    
    const data = [
      { name: 'Positivo', value: analytics.sentimentOverview.positive },
      { name: 'Neutro', value: analytics.sentimentOverview.neutral },
      { name: 'Negativo', value: analytics.sentimentOverview.negative }
    ].filter(item => item.value > 0);
    
    return {
      series: data.map(item => item.value),
      labels: data.map(item => item.name)
    };
  }, [analytics?.sentimentOverview]);

  const sentimentChartOptions: ApexOptions = useMemo(() => ({
    chart: {
      type: 'donut',
      height: 300,
      fontFamily: 'inherit',
      toolbar: {
        show: false
      },
      animations: {
        enabled: true,
        speed: 800
      }
    },
    colors: ['#22c55e', '#eab308', '#ef4444'], // Verde semântico, amarelo, vermelho
    labels: sentimentOverviewData.labels,
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '14px',
        fontWeight: '600',
        colors: ['#ffffff']
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 1,
        blur: 1,
        opacity: 0.8
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '16px',
              fontWeight: '600',
              color: 'hsl(var(--foreground))'
            },
            value: {
              show: true,
              fontSize: '24px',
              fontWeight: '700',
              color: 'hsl(var(--foreground))',
              formatter: function (val: string) {
                return val;
              }
            },
            total: {
              show: true,
              showAlways: true,
              label: 'Total',
              fontSize: '14px',
              fontWeight: '600',
              color: 'hsl(var(--muted-foreground))',
              formatter: function (w: any) {
                return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
              }
            }
          }
        }
      }
    },
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '14px',
      fontWeight: '500',
      labels: {
        colors: 'hsl(var(--foreground))'
      },
      markers: {
        size: 12,
        strokeWidth: 2,
        shape: 'circle'
      },
      itemMargin: {
        horizontal: 15,
        vertical: 5
      }
    },
    tooltip: {
      enabled: true,
      style: {
        fontSize: '14px'
      },
      y: {
        formatter: function (val: number) {
          return val + ' respostas';
        }
      }
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: {
            height: 250
          },
          legend: {
            position: 'bottom',
            fontSize: '12px'
          },
          dataLabels: {
            style: {
              fontSize: '12px'
            }
          }
        }
      },
      {
        breakpoint: 480,
        options: {
          chart: {
            height: 200
          },
          legend: {
            fontSize: '11px'
          },
          dataLabels: {
            style: {
              fontSize: '11px'
            }
          }
        }
      }
    ]
  }), [sentimentOverviewData.labels]);

  const responsesByDateData = useMemo(() => {
    if (!analytics) return [] as Array<{ name: string; value: number }>;
    return analytics.responsesByDate.map(item => ({
      name: item.date,
      value: item.count
    }));
  }, [analytics?.responsesByDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-600 animate-pulse" />
          <p className="text-gray-500">Carregando análises...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-red-600" />
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={refreshAnalytics} variant="outline">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-500">Nenhum dado de análise disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas gerais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card Total de Respostas */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/20 rounded-lg p-2 mb-2">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-purple-100 text-xs font-medium mb-1">Total de Respostas</p>
            <p className="text-2xl font-bold">{analytics.totalResponses}</p>
          </div>
          <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white/10 rounded-full"></div>
        </div>

        {/* Card Questões */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/20 rounded-lg p-2 mb-2">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-blue-100 text-xs font-medium mb-1">Questões</p>
            <p className="text-2xl font-bold">{analytics.questions.length}</p>
          </div>
          <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white/10 rounded-full"></div>
        </div>

        {/* Card Sentimento Positivo */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/20 rounded-lg p-2 mb-2">
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="text-emerald-100 text-xs font-medium mb-1">Sentimento Positivo</p>
            <p className="text-2xl font-bold">{analytics.sentimentOverview.positive}</p>
          </div>
          <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white/10 rounded-full"></div>
        </div>

        {/* Card Sentimento Negativo */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-red-500 to-red-700 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/20 rounded-lg p-2 mb-2">
              <TrendingDown className="h-5 w-5" />
            </div>
            <p className="text-red-100 text-xs font-medium mb-1">Sentimento Negativo</p>
            <p className="text-2xl font-bold">{analytics.sentimentOverview.negative}</p>
          </div>
          <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white/10 rounded-full"></div>
        </div>

        {/* Card Sentimento Neutro */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-700 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/20 rounded-lg p-2 mb-2">
              <Brain className="h-5 w-5" />
            </div>
            <p className="text-yellow-100 text-xs font-medium mb-1">Sentimento Neutro</p>
            <p className="text-2xl font-bold">{analytics.sentimentOverview.neutral}</p>
          </div>
          <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white/10 rounded-full"></div>
        </div>

        {/* Card de Exportar */}
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/20 rounded-lg p-2 mb-2">
              <Download className="h-5 w-5" />
            </div>
            <p className="text-orange-100 text-xs font-medium mb-1">Exportar</p>
            <div className="flex flex-col space-y-1">
              <Button 
                onClick={() => exportData('csv')} 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/20 border-white/30 border h-6 px-2 text-xs"
              >
                CSV
              </Button>
              <Button 
                onClick={() => exportData('json')} 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/20 border-white/30 border h-6 px-2 text-xs"
              >
                JSON
              </Button>
            </div>
          </div>
          <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-white/10 rounded-full"></div>
        </div>
      </div>

      {/* Análises Avançadas */}
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-primary to-primary/50 rounded-full"></div>
          <h3 className="text-2xl font-bold text-foreground">Análises Avançadas</h3>
        </div>
        
        {/* Dashboard de Análise Geral */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              Dashboard de Análise Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="sentiment">Sentimentos</TabsTrigger>
                <TabsTrigger value="trends">Tendências</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="relative p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/30 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl border border-blue-500/30 dark:border-blue-800/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Total de Questões</p>
                        <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{analytics.questions.length}</p>
                      </div>
                      <div className="p-3 bg-blue-500/10 rounded-lg">
                        <MessageSquare className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative p-6 bg-gradient-to-br from-purple-500/20 to-purple-600/30 dark:from-purple-950/30 dark:to-purple-900/20 rounded-xl border border-purple-500/30 dark:border-purple-800/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">Tipos de Questão</p>
                        <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                          {new Set(analytics.questions.map(q => q.type)).size}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-500/10 rounded-lg">
                        <Brain className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative p-6 bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-xl border border-emerald-500/30 dark:border-emerald-800/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-1">Taxa de Resposta</p>
                        <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                          {analytics.totalResponses > 0 ? '100%' : '0%'}
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-500/10 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-400/50 dark:border-gray-700/50">
                  <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Respostas por Questão
                  </h4>
                  <div className="h-80">
                    <Chart
                      options={{
                        chart: {
                          type: 'bar',
                          height: 320,
                          fontFamily: 'inherit',
                          toolbar: {
                            show: false
                          },
                          animations: {
                            enabled: true,
                            speed: 800,
                            animateGradually: {
                              enabled: true,
                              delay: 150
                            },
                            dynamicAnimation: {
                              enabled: true,
                              speed: 350
                            }
                          }
                        },
                        plotOptions: {
                          bar: {
                            horizontal: true,
                            borderRadius: 8,
                            borderRadiusApplication: 'end',
                            borderRadiusWhenStacked: 'last',
                            dataLabels: {
                              position: 'center'
                            }
                          }
                        },
                        colors: ['#3b82f6'],
                        fill: {
                          type: 'gradient',
                          gradient: {
                            shade: 'light',
                            type: 'horizontal',
                            shadeIntensity: 0.25,
                            gradientToColors: ['#06b6d4'],
                            inverseColors: false,
                            opacityFrom: 1,
                            opacityTo: 0.85,
                            stops: [0, 100]
                          }
                        },
                        dataLabels: {
                          enabled: true,
                          style: {
                            fontSize: '12px',
                            fontWeight: '600',
                            colors: ['#ffffff']
                          },
                          dropShadow: {
                            enabled: true,
                            top: 1,
                            left: 1,
                            blur: 1,
                            opacity: 0.8
                          }
                        },
                        xaxis: {
                          categories: analytics.questions.map(q => 
                            q.text.length > 30 ? q.text.substring(0, 30) + '...' : q.text
                          ),
                          labels: {
                            style: {
                              fontSize: '12px',
                              fontWeight: '500'
                            }
                          }
                        },
                        yaxis: {
                          labels: {
                            style: {
                              fontSize: '11px',
                              fontWeight: '400'
                            },
                            maxWidth: 200
                          }
                        },
                        grid: {
                          show: true,
                          borderColor: 'hsl(var(--muted-foreground) / 0.1)',
                          strokeDashArray: 3,
                          position: 'back',
                          xaxis: {
                            lines: {
                              show: true
                            }
                          },
                          yaxis: {
                            lines: {
                              show: false
                            }
                          }
                        },
                        tooltip: {
                          enabled: true,
                          theme: 'dark',
                          style: {
                            fontSize: '12px',
                            fontFamily: 'inherit'
                          },
                          custom: function({ series, seriesIndex, dataPointIndex, w }) {
                            const questionText = analytics.questions[dataPointIndex]?.text || 'Questão';
                            const responses = series[seriesIndex][dataPointIndex];
                            return `
                              <div class="px-3 py-2 bg-gray-900 text-white rounded-lg shadow-lg border border-gray-700">
                                <div class="font-semibold text-sm mb-1">${questionText}</div>
                                <div class="text-xs text-gray-300">
                                  <span class="font-medium">${responses}</span> respostas
                                </div>
                              </div>
                            `;
                          }
                        },
                        states: {
                          hover: {
                            filter: {
                              type: 'lighten'
                            }
                          },
                          active: {
                            allowMultipleDataPointsSelection: false,
                            filter: {
                              type: 'darken'
                            }
                          }
                        },
                        responsive: [
                          {
                            breakpoint: 768,
                            options: {
                              plotOptions: {
                                bar: {
                                  borderRadius: 4
                                }
                              },
                              dataLabels: {
                                style: {
                                  fontSize: '10px'
                                }
                              }
                            }
                          }
                        ]
                      }}
                      series={[{
                        name: 'Respostas',
                        data: analytics.questions.map(q => q.statistics.totalResponses)
                      }]}
                      type="bar"
                      height={320}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="sentiment" className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-400/50 dark:border-gray-700/50">
                  <h4 className="text-lg font-semibold text-foreground mb-4">Análise de Sentimento</h4>
                  {sentimentOverviewData.series.length > 0 ? (
                    <div className="w-full">
                      <Chart
                        options={sentimentChartOptions}
                        series={sentimentOverviewData.series}
                        type="donut"
                        height={300}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Nenhum dado de sentimento disponível</p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="trends" className="space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-400/50 dark:border-gray-700/50">
                  <h4 className="text-lg font-semibold text-foreground mb-4">Tendências de Respostas</h4>
                  {responsesByDateData.length > 0 ? (
                    <div className="h-64">
                      <Chart
                        options={{
                          chart: {
                            type: 'line',
                            height: 256,
                            fontFamily: 'inherit',
                            toolbar: {
                              show: false
                            },
                            animations: {
                              enabled: true,
                              speed: 800,
                              animateGradually: {
                                enabled: true,
                                delay: 150
                              },
                              dynamicAnimation: {
                                enabled: true,
                                speed: 350
                              }
                            },
                            zoom: {
                              enabled: false
                            }
                          },
                          colors: ['#3b82f6'],
                          stroke: {
                            curve: 'smooth',
                            width: 3,
                            lineCap: 'round'
                          },
                          fill: {
                            type: 'gradient',
                            gradient: {
                              shade: 'light',
                              type: 'vertical',
                              shadeIntensity: 0.4,
                              gradientToColors: ['#60a5fa'],
                              inverseColors: false,
                              opacityFrom: 0.8,
                              opacityTo: 0.1,
                              stops: [0, 100]
                            }
                          },
                          markers: {
                            size: 6,
                            colors: ['#3b82f6'],
                            strokeColors: '#ffffff',
                            strokeWidth: 2,
                            hover: {
                              size: 8,
                              sizeOffset: 2
                            }
                          },
                          grid: {
                            show: true,
                            borderColor: 'hsl(var(--muted-foreground) / 0.1)',
                            strokeDashArray: 3,
                            position: 'back',
                            xaxis: {
                              lines: {
                                show: true
                              }
                            },
                            yaxis: {
                              lines: {
                                show: true
                              }
                            }
                          },
                          xaxis: {
                            categories: responsesByDateData.map(item => item.name),
                            labels: {
                              style: {
                                fontSize: '12px',
                                fontWeight: '500'
                              },
                              rotate: -45
                            },
                            axisBorder: {
                              show: false
                            },
                            axisTicks: {
                              show: false
                            }
                          },
                          yaxis: {
                            labels: {
                              style: {
                                fontSize: '11px',
                                fontWeight: '400'
                              }
                            },
                            min: 0
                          },
                          tooltip: {
                            enabled: true,
                            theme: 'dark',
                            style: {
                              fontSize: '12px',
                              fontFamily: 'inherit'
                            },
                            custom: function({ series, seriesIndex, dataPointIndex, w }) {
                              const date = responsesByDateData[dataPointIndex]?.name || 'Data';
                              const responses = series[seriesIndex][dataPointIndex];
                              return `
                                <div class="px-3 py-2 bg-gray-900 text-white rounded-lg shadow-lg border border-gray-700">
                                  <div class="font-semibold text-sm mb-1">${date}</div>
                                  <div class="text-xs text-gray-300">
                                    <span class="font-medium">${responses}</span> respostas
                                  </div>
                                </div>
                              `;
                            }
                          },
                          responsive: [
                            {
                              breakpoint: 768,
                              options: {
                                xaxis: {
                                  labels: {
                                    rotate: -90,
                                    style: {
                                      fontSize: '10px'
                                    }
                                  }
                                }
                              }
                            }
                          ]
                        }}
                        series={[{
                          name: 'Respostas por Data',
                          data: responsesByDateData.map(item => item.value)
                        }]}
                        type="area"
                        height={256}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Nenhum dado de tendência disponível</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Seção Start Quantico - Análises Básicas */}
        {accountType === 'start-quantico' && (
          <div className="mt-8">
            <StartQuanticoAnalytics surveyId={surveyId} />
          </div>
        )}

        {/* Seção Vórtex Neural - Análises Avançadas */}
        {accountType === 'vortex-neural' && (
          <div className="mt-8">
            <VortexNeuralAnalytics surveyId={surveyId} />
          </div>
        )}

        {/* Seção Nexus Infinito - Análises Estatísticas Avançadas */}
        {accountType === 'nexus-infinito' && (
          <div className="mt-8">
            <NexusInfinitoAnalytics surveyId={surveyId} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;