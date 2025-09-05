import React, { useState } from 'react';
import { Shield, Lock, Users, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { SECURITY_LEVELS, SecurityManager, useSecurityConfig } from '../config/securityConfig';

interface SecuritySettingsProps {
  className?: string;
  showAdvanced?: boolean;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ 
  className = '', 
  showAdvanced = false 
}) => {
  const { config, manager, isSecure, allowsAnonymous } = useSecurityConfig();
  const [selectedLevel, setSelectedLevel] = useState(config.id);
  const [showDetails, setShowDetails] = useState(false);

  const getSecurityIcon = (levelId: string) => {
    switch (levelId) {
      case 'maximum': return <Shield className="w-5 h-5 text-green-600" />;
      case 'high': return <Lock className="w-5 h-5 text-blue-600" />;
      case 'medium': return <Users className="w-5 h-5 text-yellow-600" />;
      case 'low': return <Eye className="w-5 h-5 text-red-600" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const getSecurityColor = (levelId: string) => {
    switch (levelId) {
      case 'maximum': return 'border-green-200 bg-green-50';
      case 'high': return 'border-blue-200 bg-blue-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getCurrentStatus = () => {
    if (isSecure) {
      return (
        <div className="flex items-center gap-2 text-green-700 bg-green-100 px-3 py-2 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Sistema Seguro</span>
        </div>
      );
    }
    
    if (allowsAnonymous) {
      return (
        <div className="flex items-center gap-2 text-yellow-700 bg-yellow-100 px-3 py-2 rounded-lg">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">Acesso Anônimo Ativo</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-blue-700 bg-blue-100 px-3 py-2 rounded-lg">
        <Lock className="w-4 h-4" />
        <span className="text-sm font-medium">Segurança Ativa</span>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-gray-700" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Configurações de Segurança
            </h3>
            <p className="text-sm text-gray-600">
              Controle os níveis de acesso e segurança do sistema
            </p>
          </div>
        </div>
        {getCurrentStatus()}
      </div>

      {/* Current Configuration */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          {getSecurityIcon(config.id)}
          <h4 className="font-medium text-gray-900">{config.name}</h4>
        </div>
        <p className="text-sm text-gray-600 mb-3">{config.description}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              config.allowAnonymousAccess ? 'bg-red-500' : 'bg-green-500'
            }`} />
            <span>Acesso Anônimo: {config.allowAnonymousAccess ? 'Permitido' : 'Bloqueado'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              config.requireAuthentication ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            <span>Autenticação: {config.requireAuthentication ? 'Obrigatória' : 'Opcional'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              config.enableRLS ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span>RLS: {config.enableRLS ? 'Ativo' : 'Inativo'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              config.auditLevel === 'detailed' ? 'bg-green-500' : 
              config.auditLevel === 'basic' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span>Auditoria: {config.auditLevel === 'detailed' ? 'Detalhada' : 
                              config.auditLevel === 'basic' ? 'Básica' : 'Desabilitada'}</span>
          </div>
        </div>
      </div>

      {/* Security Levels */}
      {showAdvanced && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Níveis Disponíveis</h4>
          <div className="grid gap-3">
            {Object.values(SECURITY_LEVELS).map((level) => (
              <div
                key={level.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedLevel === level.id 
                    ? getSecurityColor(level.id) + ' border-opacity-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedLevel(level.id)}
              >
                <div className="flex items-center gap-3 mb-2">
                  {getSecurityIcon(level.id)}
                  <h5 className="font-medium text-gray-900">{level.name}</h5>
                  {level.id === config.id && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Atual
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{level.description}</p>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={level.features.publicSurveys ? 'text-green-600' : 'text-red-600'}>
                      {level.features.publicSurveys ? '✓' : '✗'} Pesquisas Públicas
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={level.features.guestResponses ? 'text-green-600' : 'text-red-600'}>
                      {level.features.guestResponses ? '✓' : '✗'} Respostas de Convidados
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={level.features.anonymousAnalytics ? 'text-green-600' : 'text-red-600'}>
                      {level.features.anonymousAnalytics ? '✓' : '✗'} Analytics Anônimos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={level.features.publicDashboard ? 'text-green-600' : 'text-red-600'}>
                      {level.features.publicDashboard ? '✓' : '✗'} Dashboard Público
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Status */}
      <div className="mb-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <span>Funcionalidades Ativas</span>
          <span className={`transform transition-transform ${
            showDetails ? 'rotate-180' : ''
          }`}>▼</span>
        </button>
        
        {showDetails && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded">
              <h5 className="font-medium text-gray-900 mb-2">Permissões de Acesso</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Visualizar Pesquisas:</span>
                  <span className={manager.isActionAllowed('view_surveys') ? 'text-green-600' : 'text-red-600'}>
                    {manager.isActionAllowed('view_surveys') ? 'Permitido' : 'Negado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Criar Pesquisas:</span>
                  <span className={manager.isActionAllowed('create_survey') ? 'text-green-600' : 'text-red-600'}>
                    {manager.isActionAllowed('create_survey') ? 'Permitido' : 'Negado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Responder Pesquisas:</span>
                  <span className={manager.isActionAllowed('respond_survey') ? 'text-green-600' : 'text-red-600'}>
                    {manager.isActionAllowed('respond_survey') ? 'Permitido' : 'Negado'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-gray-50 rounded">
              <h5 className="font-medium text-gray-900 mb-2">Analytics e Dashboard</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Ver Analytics:</span>
                  <span className={manager.isActionAllowed('view_analytics') ? 'text-green-600' : 'text-red-600'}>
                    {manager.isActionAllowed('view_analytics') ? 'Permitido' : 'Negado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Dashboard Público:</span>
                  <span className={manager.isActionAllowed('view_dashboard') ? 'text-green-600' : 'text-red-600'}>
                    {manager.isActionAllowed('view_dashboard') ? 'Permitido' : 'Negado'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Warning for Low Security */}
      {config.id === 'low' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Aviso de Segurança</span>
          </div>
          <p className="text-sm text-red-600">
            O nível de segurança atual é inadequado para ambientes de produção. 
            Recomendamos usar "Segurança Máxima" ou "Segurança Alta" em produção.
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">Como Alterar o Nível de Segurança</h5>
        <div className="text-sm text-blue-700 space-y-1">
          <p>1. Defina a variável <code className="bg-blue-100 px-1 rounded">VITE_SECURITY_LEVEL</code> no arquivo .env</p>
          <p>2. Valores possíveis: MAXIMUM, HIGH, MEDIUM, LOW</p>
          <p>3. Reinicie a aplicação para aplicar as mudanças</p>
          <p>4. Execute os scripts SQL correspondentes no Supabase para aplicar as políticas RLS</p>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;