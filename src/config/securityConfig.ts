// =====================================================
// CONFIGURAÇÃO DE SEGURANÇA DO SISTEMA
// =====================================================
// Este arquivo define as opções de segurança disponíveis
// e controla o comportamento do sistema baseado no nível escolhido

export interface SecurityLevel {
  id: string;
  name: string;
  description: string;
  allowAnonymousAccess: boolean;
  requireAuthentication: boolean;
  enableRLS: boolean;
  auditLevel: 'none' | 'basic' | 'detailed';
  features: {
    publicSurveys: boolean;
    guestResponses: boolean;
    anonymousAnalytics: boolean;
    publicDashboard: boolean;
  };
}

// Níveis de segurança disponíveis
export const SECURITY_LEVELS: Record<string, SecurityLevel> = {
  // Nível máximo de segurança - sem acesso anônimo
  MAXIMUM: {
    id: 'maximum',
    name: 'Segurança Máxima',
    description: 'Nenhum acesso anônimo permitido. Apenas usuários autenticados podem usar o sistema.',
    allowAnonymousAccess: false,
    requireAuthentication: true,
    enableRLS: true,
    auditLevel: 'detailed',
    features: {
      publicSurveys: false,
      guestResponses: false,
      anonymousAnalytics: false,
      publicDashboard: false
    }
  },
  
  // Nível alto - acesso limitado para convidados
  HIGH: {
    id: 'high',
    name: 'Segurança Alta',
    description: 'Usuários podem responder pesquisas públicas, mas precisam se autenticar para criar.',
    allowAnonymousAccess: false,
    requireAuthentication: true,
    enableRLS: true,
    auditLevel: 'basic',
    features: {
      publicSurveys: true,
      guestResponses: true,
      anonymousAnalytics: false,
      publicDashboard: false
    }
  },
  
  // Nível médio - funcionalidades públicas limitadas
  MEDIUM: {
    id: 'medium',
    name: 'Segurança Média',
    description: 'Permite algumas funcionalidades públicas com controles de segurança.',
    allowAnonymousAccess: true,
    requireAuthentication: false,
    enableRLS: true,
    auditLevel: 'basic',
    features: {
      publicSurveys: true,
      guestResponses: true,
      anonymousAnalytics: true,
      publicDashboard: false
    }
  },
  
  // Nível baixo - máxima flexibilidade (não recomendado para produção)
  LOW: {
    id: 'low',
    name: 'Segurança Baixa',
    description: 'Máxima flexibilidade. Apenas para desenvolvimento ou casos específicos.',
    allowAnonymousAccess: true,
    requireAuthentication: false,
    enableRLS: false,
    auditLevel: 'none',
    features: {
      publicSurveys: true,
      guestResponses: true,
      anonymousAnalytics: true,
      publicDashboard: true
    }
  }
};

// Configuração atual (pode ser alterada via variável de ambiente)
const getCurrentSecurityLevel = (): SecurityLevel => {
  const envLevel = import.meta.env.VITE_SECURITY_LEVEL || 'MAXIMUM';
  return SECURITY_LEVELS[envLevel] || SECURITY_LEVELS.MAXIMUM;
};

export const CURRENT_SECURITY_CONFIG = getCurrentSecurityLevel();

// Utilitários para verificar permissões
export class SecurityManager {
  private static config = CURRENT_SECURITY_CONFIG;
  
  static canAccessWithoutAuth(): boolean {
    return this.config.allowAnonymousAccess;
  }
  
  static requiresAuthentication(): boolean {
    return this.config.requireAuthentication;
  }
  
  static isRLSEnabled(): boolean {
    return this.config.enableRLS;
  }
  
  static canCreatePublicSurveys(): boolean {
    return this.config.features.publicSurveys;
  }
  
  static canGuestsRespond(): boolean {
    return this.config.features.guestResponses;
  }
  
  static canViewAnonymousAnalytics(): boolean {
    return this.config.features.anonymousAnalytics;
  }
  
  static canViewPublicDashboard(): boolean {
    return this.config.features.publicDashboard;
  }
  
  static getAuditLevel(): 'none' | 'basic' | 'detailed' {
    return this.config.auditLevel;
  }
  
  static getCurrentConfig(): SecurityLevel {
    return this.config;
  }
  
  static getConfigName(): string {
    return this.config.name;
  }
  
  static getConfigDescription(): string {
    return this.config.description;
  }
  
  // Verificar se uma ação específica é permitida
  static isActionAllowed(action: string, isAuthenticated: boolean = false): boolean {
    switch (action) {
      case 'view_surveys':
        return isAuthenticated || this.config.features.publicSurveys;
      
      case 'create_survey':
        return isAuthenticated || !this.config.requireAuthentication;
      
      case 'respond_survey':
        return isAuthenticated || this.config.features.guestResponses;
      
      case 'view_analytics':
        return isAuthenticated || this.config.features.anonymousAnalytics;
      
      case 'view_dashboard':
        return isAuthenticated || this.config.features.publicDashboard;
      
      default:
        return isAuthenticated;
    }
  }
  
  // Obter mensagem de erro para ação não permitida
  static getAccessDeniedMessage(action: string): string {
    if (this.config.requireAuthentication) {
      return 'Esta ação requer autenticação. Por favor, faça login para continuar.';
    }
    
    switch (action) {
      case 'create_survey':
        return 'Criação de pesquisas não permitida no nível de segurança atual.';
      
      case 'view_analytics':
        return 'Visualização de analytics não permitida para usuários não autenticados.';
      
      case 'view_dashboard':
        return 'Acesso ao dashboard requer autenticação.';
      
      default:
        return 'Acesso negado. Nível de segurança insuficiente.';
    }
  }
}

// Hook para usar no React
export const useSecurityConfig = () => {
  return {
    config: CURRENT_SECURITY_CONFIG,
    manager: SecurityManager,
    isSecure: CURRENT_SECURITY_CONFIG.id === 'maximum',
    allowsAnonymous: CURRENT_SECURITY_CONFIG.allowAnonymousAccess
  };
};

// Constantes para facilitar o uso
export const SECURITY_CONSTANTS = {
  LEVELS: Object.keys(SECURITY_LEVELS),
  CURRENT_LEVEL: CURRENT_SECURITY_CONFIG.id.toUpperCase(),
  IS_PRODUCTION_READY: ['maximum', 'high'].includes(CURRENT_SECURITY_CONFIG.id),
  REQUIRES_AUTH: CURRENT_SECURITY_CONFIG.requireAuthentication,
  RLS_ENABLED: CURRENT_SECURITY_CONFIG.enableRLS
} as const;

export default SecurityManager;