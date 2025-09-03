import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface CorrelationData {
  variables: string[];
  matrix: number[][];
}

export interface CorrelationMatrixProps {
  data: CorrelationData;
  title?: string;
  description?: string;
  className?: string;
}

const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  data,
  title = 'Matriz de Correlação',
  description = 'Análise de correlação entre variáveis',
  className = ''
}) => {
  if (!data || !data.variables || !data.matrix) {
    console.warn('CorrelationMatrix: data prop must contain variables and matrix arrays');
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Dados de correlação não disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  const { variables, matrix } = data;

  // Função para obter cor baseada no valor de correlação
  const getCorrelationColor = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue >= 0.8) return value > 0 ? 'bg-green-600' : 'bg-red-600';
    if (absValue >= 0.6) return value > 0 ? 'bg-green-500' : 'bg-red-500';
    if (absValue >= 0.4) return value > 0 ? 'bg-green-400' : 'bg-red-400';
    if (absValue >= 0.2) return value > 0 ? 'bg-green-300' : 'bg-red-300';
    return 'bg-gray-200';
  };

  // Função para obter intensidade da cor
  const getOpacity = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue >= 0.8) return 'opacity-100';
    if (absValue >= 0.6) return 'opacity-80';
    if (absValue >= 0.4) return 'opacity-60';
    if (absValue >= 0.2) return 'opacity-40';
    return 'opacity-20';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-green-500 rounded"></div>
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legenda */}
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-600 rounded"></div>
              <span>Correlação Negativa Forte</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-200 rounded"></div>
              <span>Sem Correlação</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-600 rounded"></div>
              <span>Correlação Positiva Forte</span>
            </div>
          </div>

          {/* Matriz de Correlação */}
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-24"></th>
                    {variables.map((variable, index) => (
                      <th
                        key={index}
                        className="p-2 text-xs font-medium text-center border border-gray-200 bg-gray-50 min-w-[60px]"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                      >
                        {variable}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {variables.map((rowVariable, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="p-2 text-xs font-medium text-right border border-gray-200 bg-gray-50 max-w-[100px] truncate">
                        {rowVariable}
                      </td>
                      {variables.map((colVariable, colIndex) => {
                        const value = matrix[rowIndex]?.[colIndex] ?? 0;
                        const colorClass = getCorrelationColor(value);
                        const opacityClass = getOpacity(value);
                        
                        return (
                          <td
                            key={colIndex}
                            className={`p-2 text-center border border-gray-200 relative group cursor-pointer ${colorClass} ${opacityClass}`}
                            title={`${rowVariable} vs ${colVariable}: ${value.toFixed(3)}`}
                          >
                            <span className="text-xs font-medium text-white drop-shadow-sm">
                              {value.toFixed(2)}
                            </span>
                            
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                              <div className="font-medium">{rowVariable} × {colVariable}</div>
                              <div>Correlação: {value.toFixed(3)}</div>
                              <div className="text-gray-300">
                                {Math.abs(value) >= 0.8 ? 'Muito forte' :
                                 Math.abs(value) >= 0.6 ? 'Forte' :
                                 Math.abs(value) >= 0.4 ? 'Moderada' :
                                 Math.abs(value) >= 0.2 ? 'Fraca' : 'Muito fraca'}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Estatísticas resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {matrix.flat().filter(v => v > 0.6).length}
              </div>
              <div className="text-xs text-muted-foreground">Correlações Fortes Positivas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {matrix.flat().filter(v => v < -0.6).length}
              </div>
              <div className="text-xs text-muted-foreground">Correlações Fortes Negativas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {Math.max(...matrix.flat()).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Correlação Máxima</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {Math.min(...matrix.flat()).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Correlação Mínima</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CorrelationMatrix;