import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Database, AlertTriangle, ExternalLink } from 'lucide-react';

interface AnalyticsDashboardFallbackProps {
  surveyId: string;
}

const AnalyticsDashboardFallback: React.FC<AnalyticsDashboardFallbackProps> = ({ surveyId }) => {
  return (
    <div className="space-y-6">
      {/* Aviso sobre configuração do banco */}
      <Card className="border-yellow-500 bg-yellow-500/20">
        <CardHeader>
          <CardTitle className="flex items-center text-yellow-800">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Configuração do Banco de Dados Necessária
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-yellow-700">
              Para visualizar os relatórios e analytics, é necessário configurar as políticas de segurança do banco de dados.
            </p>
            <div className="bg-white p-4 rounded-lg border border-yellow-500">
              <h4 className="font-semibold text-gray-900 mb-2">Passos para configuração:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Acesse o Supabase Dashboard do seu projeto</li>
                <li>Vá para a seção "SQL Editor"</li>
                <li>Execute o script <code className="bg-gray-500/20 px-1 rounded">fix_rls_policies.sql</code> que foi criado na raiz do projeto</li>
                <li>Recarregue esta página após executar o script</li>
              </ol>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                className="border-yellow-600 text-yellow-800 hover:bg-yellow-500/20"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Supabase Dashboard
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
                className="border-yellow-600 text-yellow-800 hover:bg-yellow-500/20"
              >
                Recarregar Página
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder para analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-gray-600">
            <BarChart3 className="h-5 w-5 mr-2" />
            Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Database className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Aguardando Configuração do Banco
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Os gráficos e estatísticas aparecerão aqui após a configuração das políticas de segurança do banco de dados.
            </p>
            <div className="mt-6 p-4 bg-gray-500/20 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Survey ID:</strong> {surveyId}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações sobre funcionalidades */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-3 text-blue-500" />
            <h4 className="font-semibold text-gray-900 mb-2">Gráficos Interativos</h4>
            <p className="text-sm text-gray-600">
              Visualize respostas com gráficos de barras e pizza
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Database className="h-8 w-8 mx-auto mb-3 text-green-500" />
            <h4 className="font-semibold text-gray-900 mb-2">Análise de Sentimento</h4>
            <p className="text-sm text-gray-600">
              IA analisa o sentimento das respostas abertas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-purple-500" />
            <h4 className="font-semibold text-gray-900 mb-2">Estatísticas Avançadas</h4>
            <p className="text-sm text-gray-600">
              Média, mediana, moda e desvio padrão
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboardFallback;