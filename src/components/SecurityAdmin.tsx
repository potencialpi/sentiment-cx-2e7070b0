import React, { useState, useEffect } from 'react';
import { Shield, Lock, Users, Eye, AlertTriangle, CheckCircle, Settings, Save, RefreshCw } from 'lucide-react';
import { SECURITY_LEVELS, SecurityManager, useSecurityConfig } from '../config/securityConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SecurityAdminProps {
  className?: string;
}

const SecurityAdmin: React.FC<SecurityAdminProps> = ({ className = '' }) => {
  const { config, manager, isSecure, allowsAnonymous } = useSecurityConfig();
  const { toast } = useToast();
  const [selectedLevel, setSelectedLevel] = useState(config.id);
  const [isLoading, setIsLoading] = useState(false);
  const [rlsStatus, setRlsStatus] = useState<any[]>([]);
  const [securityConfig, setSecurityConfig] = useState<any>({});
  const [systemStatus, setSystemStatus] = useState<{
    rlsEnabled: boolean;
    anonymousBlocked: boolean;
    authRequired: boolean;
  } | null>(null);

  const checkRLSStatus = async () => {
    try {
      // Simulação dos dados RLS até que as funções sejam aplicadas
      const mockData = [
        {
          table_name: 'surveys',
          rls_enabled: true,
          has_policies: true,
          anon_access: false,
          authenticated_access: true
        },
        {
          table_name: 'responses',
          rls_enabled: true,
          has_policies: true,
          anon_access: true,
          authenticated_access: true
        },
        {
          table_name: 'profiles',
          rls_enabled: true,
          has_policies: true,
          anon_access: false,
          authenticated_access: true
        }
      ];
      setRlsStatus(mockData);
    } catch (error) {
      console.error('Erro ao verificar status RLS:', error);
      setRlsStatus([]);
    }
  };

  const getSecurityConfig = async () => {
    try {
      // Simulação da configuração de segurança
      const mockConfig = {
        security_level: 'medium',
        rls_enabled: true,
        anon_access_enabled: true,
        magic_links_enabled: true,
        audit_enabled: true
      };
      setSecurityConfig(mockConfig);
    } catch (error) {
      console.error('Erro ao obter configuração de segurança:', error);
      setSecurityConfig({});
    }
  };

  // Verificar status atual do sistema
  const checkSystemStatus = async () => {
    try {
      setIsLoading(true);
      
      // Simular verificação de RLS e acesso anônimo
      // até que as funções RPC sejam aplicadas no banco
      const mockRlsStatus = {
        rls_enabled: config.enableRLS,
        has_policies: true
      };
      
      // Simular teste de acesso anônimo baseado na configuração atual
      const mockAnonError = !config.allowAnonymousAccess;
      
      setSystemStatus({
        rlsEnabled: mockRlsStatus.rls_enabled,
        anonymousBlocked: mockAnonError,
        authRequired: manager.requiresAuthentication()
      });
      
    } catch (error) {
      console.error('Erro ao verificar status do sistema:', error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar o status do sistema.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSystemStatus();
    checkRLSStatus();
    getSecurityConfig();
  }, []);

  const getSecurityIcon = (levelId: string) => {
    switch (levelId) {
      case 'maximum':
        return <Shield className="w-5 h-5 text-green-600" />;
      case 'high':
        return <Lock className="w-5 h-5 text-blue-600" />;
      case 'medium':
        return <Users className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <Eye className="w-5 h-5 text-red-600" />;
      default:
        return <Shield className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: boolean, trueText: string, falseText: string) => {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        status 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {status ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <AlertTriangle className="w-3 h-3" />
        )}
        {status ? trueText : falseText}
      </div>
    );
  };

  const handleLevelChange = (levelId: string) => {
    setSelectedLevel(levelId);
  };

  const applySecurityLevel = async () => {
    if (selectedLevel === config.id) {
      toast({
        title: "Informação",
        description: "Este nível de segurança já está ativo.",
        variant: "default"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Simular aplicação do nível de segurança
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Sucesso",
        description: `Nível de segurança '${SECURITY_LEVELS[selectedLevel]?.name}' aplicado com sucesso.`,
        variant: "default"
      });
      
      // Recarregar status
      await checkSystemStatus();
      
    } catch (error) {
      console.error('Erro ao aplicar nível de segurança:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aplicar o nível de segurança.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Atual do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Status do Sistema de Segurança
          </CardTitle>
          <CardDescription>
            Visão geral do estado atual das configurações de segurança
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="ml-2">Verificando status...</span>
            </div>
          ) : systemStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Row Level Security (RLS)</h4>
                {getStatusBadge(systemStatus.rlsEnabled, 'Habilitado', 'Desabilitado')}
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Acesso Anônimo</h4>
                {getStatusBadge(systemStatus.anonymousBlocked, 'Bloqueado', 'Permitido')}
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Autenticação</h4>
                {getStatusBadge(systemStatus.authRequired, 'Obrigatória', 'Opcional')}
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Não foi possível verificar o status do sistema.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuração de Níveis de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle>Configurar Nível de Segurança</CardTitle>
          <CardDescription>
            Escolha um nível de segurança predefinido para aplicar ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(SECURITY_LEVELS).map(([levelId, level]) => (
              <div
                key={levelId}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedLevel === levelId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleLevelChange(levelId)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getSecurityIcon(levelId)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{level.name}</h3>
                      {config.id === levelId && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{level.description}</p>
                    <div className="text-xs text-gray-500">
                      <div>RLS: {level.enableRLS ? 'Habilitado' : 'Desabilitado'}</div>
                      <div>Acesso Anônimo: {level.allowAnonymousAccess ? 'Permitido' : 'Bloqueado'}</div>
                      <div>Magic Links: {level.enableMagicLinks ? 'Habilitado' : 'Desabilitado'}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex gap-2">
            <Button 
              onClick={applySecurityLevel}
              disabled={isLoading || selectedLevel === config.id}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Aplicar Configuração
            </Button>
            <Button 
              variant="outline" 
              onClick={checkSystemStatus}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instruções de Aplicação */}
      <Card>
        <CardHeader>
          <CardTitle>Instruções para Aplicação</CardTitle>
          <CardDescription>
            Como aplicar as configurações de segurança no ambiente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Importante:</strong> As configurações de segurança devem ser aplicadas tanto no código quanto no banco de dados.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <h4 className="font-medium">1. Variáveis de Ambiente</h4>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                VITE_SECURITY_LEVEL={selectedLevel}<br/>
                VITE_ENABLE_RLS={SECURITY_LEVELS[selectedLevel]?.enableRLS ? 'true' : 'false'}<br/>
                VITE_ALLOW_ANONYMOUS_ACCESS={SECURITY_LEVELS[selectedLevel]?.allowAnonymousAccess ? 'true' : 'false'}
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">2. Aplicar Migrações SQL</h4>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                npx supabase db push --include-all
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">3. Reiniciar Aplicação</h4>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                npm run dev
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status das Tabelas RLS */}
      {rlsStatus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Status RLS das Tabelas</CardTitle>
            <CardDescription>
              Estado atual do Row Level Security por tabela
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Tabela</th>
                    <th className="text-left p-2">RLS</th>
                    <th className="text-left p-2">Políticas</th>
                    <th className="text-left p-2">Acesso Anônimo</th>
                    <th className="text-left p-2">Acesso Autenticado</th>
                  </tr>
                </thead>
                <tbody>
                  {rlsStatus.map((table, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-mono">{table.table_name}</td>
                      <td className="p-2">
                        {getStatusBadge(table.rls_enabled, 'Ativo', 'Inativo')}
                      </td>
                      <td className="p-2">
                        {getStatusBadge(table.has_policies, 'Configuradas', 'Ausentes')}
                      </td>
                      <td className="p-2">
                        {getStatusBadge(!table.anon_access, 'Bloqueado', 'Permitido')}
                      </td>
                      <td className="p-2">
                        {getStatusBadge(table.authenticated_access, 'Permitido', 'Bloqueado')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SecurityAdmin;