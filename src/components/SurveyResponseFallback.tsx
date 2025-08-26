import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Database, ExternalLink, RefreshCw } from 'lucide-react';

interface SurveyResponseFallbackProps {
  surveyId: string;
  error?: string;
}

export const SurveyResponseFallback: React.FC<SurveyResponseFallbackProps> = ({ 
  surveyId, 
  error 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Aviso sobre configuração do banco */}
        <Card className="mb-6 border-yellow-500 bg-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Configuração do Banco de Dados Necessária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-yellow-700">
                A pesquisa não pode ser carregada devido a problemas de configuração do banco de dados.
              </p>
              
              <div className="bg-yellow-500/30 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">Para corrigir este problema:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
                  <li>Acesse o Supabase Dashboard</li>
                  <li>Vá para SQL Editor</li>
                  <li>Execute o script <code className="bg-yellow-600/30 px-1 rounded">fix_survey_response_rls.sql</code></li>
                  <li>Recarregue esta página</li>
                </ol>
              </div>
              
              {error && (
                <div className="bg-red-500/20 border border-red-500 p-3 rounded-lg">
                  <p className="text-sm text-red-700">
                    <strong>Erro técnico:</strong> {error}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
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
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recarregar Página
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder para o formulário de pesquisa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-gray-600">
              <Database className="h-5 w-5 mr-2" />
              Pesquisa: {surveyId}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Database className="h-16 w-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Pesquisa Temporariamente Indisponível
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                Esta pesquisa não pode ser carregada no momento devido a problemas de configuração do banco de dados.
              </p>
              
              <div className="bg-gray-500/20 p-6 rounded-lg max-w-md mx-auto">
                <h4 className="font-semibold text-gray-700 mb-3">O que você pode fazer:</h4>
                <ul className="text-sm text-gray-600 space-y-2 text-left">
                  <li>• Aguarde alguns minutos e tente novamente</li>
                  <li>• Entre em contato com o administrador da pesquisa</li>
                  <li>• Verifique se o link da pesquisa está correto</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Informações técnicas para desenvolvedores */}
        <Card className="mt-6 border-gray-500">
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">
              Informações Técnicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Survey ID: {surveyId}</p>
              <p>Componente: SurveyResponseFallback</p>
              <p>Status: Aguardando configuração RLS</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SurveyResponseFallback;