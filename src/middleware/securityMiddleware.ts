// =====================================================
// MIDDLEWARE DE SEGURANÇA
// =====================================================
// Este middleware intercepta requisições e aplica as
// políticas de segurança baseadas na configuração atual

import { SecurityManager } from '../config/securityConfig';

export interface SecurityContext {
  isAuthenticated: boolean;
  userId?: string;
  userRole?: string;
  sessionToken?: string;
}

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  redirectTo?: string;
  requiresAuth?: boolean;
}

export class SecurityMiddleware {
  private static instance: SecurityMiddleware;
  
  private constructor() {}
  
  static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }
  
  // Verificar se uma rota pode ser acessada
  checkRouteAccess(route: string, context: SecurityContext): SecurityCheckResult {
    const { isAuthenticated } = context;
    
    // Rotas sempre públicas (independente da configuração)
    const publicRoutes = ['/login', '/register', '/about', '/privacy', '/terms'];
    if (publicRoutes.includes(route)) {
      return { allowed: true };
    }
    
    // Rotas administrativas sempre requerem autenticação
    const adminRoutes = ['/admin', '/settings', '/users', '/analytics/admin'];
    if (adminRoutes.some(adminRoute => route.startsWith(adminRoute))) {
      if (!isAuthenticated) {
        return {
          allowed: false,
          reason: 'Rota administrativa requer autenticação',
          redirectTo: '/login',
          requiresAuth: true
        };
      }
      return { allowed: true };
    }
    
    // Verificar rotas baseadas na configuração de segurança
    return this.checkSecurityPolicyAccess(route, context);
  }
  
  private checkSecurityPolicyAccess(route: string, context: SecurityContext): SecurityCheckResult {
    const { isAuthenticated } = context;
    
    // Se requer autenticação globalmente
    if (SecurityManager.requiresAuthentication() && !isAuthenticated) {
      return {
        allowed: false,
        reason: SecurityManager.getAccessDeniedMessage('general'),
        redirectTo: '/login',
        requiresAuth: true
      };
    }
    
    // Verificar rotas específicas
    switch (true) {
      case route.startsWith('/surveys/create'):
        return this.checkAction('create_survey', context);
      
      case route.startsWith('/surveys'):
        return this.checkAction('view_surveys', context);
      
      case route.startsWith('/analytics'):
        return this.checkAction('view_analytics', context);
      
      case route.startsWith('/dashboard'):
        return this.checkAction('view_dashboard', context);
      
      case route.startsWith('/respond'):
        return this.checkAction('respond_survey', context);
      
      default:
        // Rota não específica - aplicar política geral
        if (!SecurityManager.canAccessWithoutAuth() && !isAuthenticated) {
          return {
            allowed: false,
            reason: 'Acesso requer autenticação',
            redirectTo: '/login',
            requiresAuth: true
          };
        }
        return { allowed: true };
    }
  }
  
  private checkAction(action: string, context: SecurityContext): SecurityCheckResult {
    const { isAuthenticated } = context;
    
    if (SecurityManager.isActionAllowed(action, isAuthenticated)) {
      return { allowed: true };
    }
    
    return {
      allowed: false,
      reason: SecurityManager.getAccessDeniedMessage(action),
      redirectTo: SecurityManager.requiresAuthentication() ? '/login' : '/',
      requiresAuth: SecurityManager.requiresAuthentication()
    };
  }
  
  // Verificar se uma operação de API pode ser executada
  checkApiAccess(endpoint: string, method: string, context: SecurityContext): SecurityCheckResult {
    const { isAuthenticated } = context;
    
    // APIs sempre protegidas
    const protectedApis = ['/api/admin', '/api/users', '/api/settings'];
    if (protectedApis.some(api => endpoint.startsWith(api))) {
      if (!isAuthenticated) {
        return {
          allowed: false,
          reason: 'API protegida requer autenticação'
        };
      }
    }
    
    // Verificar operações específicas
    switch (true) {
      case endpoint.includes('/surveys') && method === 'POST':
        return this.checkAction('create_survey', context);
      
      case endpoint.includes('/surveys') && method === 'GET':
        return this.checkAction('view_surveys', context);
      
      case endpoint.includes('/surveys') && ['PUT', 'PATCH', 'DELETE'].includes(method):
        // Modificações sempre requerem autenticação
        if (!isAuthenticated) {
          return {
            allowed: false,
            reason: 'Modificações requerem autenticação'
          };
        }
        return { allowed: true };
      
      case endpoint.includes('/responses') && method === 'POST':
        return this.checkAction('respond_survey', context);
      
      case endpoint.includes('/analytics'):
        return this.checkAction('view_analytics', context);
      
      default:
        // API geral - aplicar política de segurança
        if (SecurityManager.requiresAuthentication() && !isAuthenticated) {
          return {
            allowed: false,
            reason: 'API requer autenticação'
          };
        }
        return { allowed: true };
    }
  }
  
  // Gerar headers de segurança para requisições
  getSecurityHeaders(context: SecurityContext): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Adicionar nível de auditoria
    const auditLevel = SecurityManager.getAuditLevel();
    if (auditLevel !== 'none') {
      headers['X-Audit-Level'] = auditLevel;
    }
    
    // Adicionar contexto de segurança
    headers['X-Security-Level'] = SecurityManager.getCurrentConfig().id;
    headers['X-RLS-Enabled'] = SecurityManager.isRLSEnabled().toString();
    
    // Adicionar informações de autenticação se disponível
    if (context.isAuthenticated && context.userId) {
      headers['X-User-Context'] = 'authenticated';
    } else {
      headers['X-User-Context'] = 'anonymous';
    }
    
    return headers;
  }
  
  // Validar token de sessão
  validateSession(token: string): SecurityContext {
    // Implementação básica - deve ser expandida com validação real
    try {
      // Aqui você implementaria a validação real do token
      // Por exemplo, verificar JWT, consultar banco de dados, etc.
      
      if (!token) {
        return { isAuthenticated: false };
      }
      
      // Simulação de validação
      const isValid = token.length > 10; // Implementar validação real
      
      if (isValid) {
        return {
          isAuthenticated: true,
          userId: 'user-id-from-token',
          userRole: 'user',
          sessionToken: token
        };
      }
      
      return { isAuthenticated: false };
    } catch (error) {
      console.error('Erro na validação de sessão:', error);
      return { isAuthenticated: false };
    }
  }
  
  // Log de auditoria de segurança
  logSecurityEvent(event: {
    type: 'access_denied' | 'access_granted' | 'auth_required' | 'security_violation';
    route?: string;
    endpoint?: string;
    context: SecurityContext;
    reason?: string;
    timestamp?: Date;
  }) {
    const auditLevel = SecurityManager.getAuditLevel();
    
    if (auditLevel === 'none') {
      return;
    }
    
    const logEntry = {
      ...event,
      timestamp: event.timestamp || new Date(),
      securityLevel: SecurityManager.getCurrentConfig().id,
      rlsEnabled: SecurityManager.isRLSEnabled()
    };
    
    // Em produção, enviar para sistema de auditoria
    if (auditLevel === 'detailed') {
      console.log('[SECURITY AUDIT]', logEntry);
    } else if (auditLevel === 'basic' && event.type === 'access_denied') {
      console.log('[SECURITY]', {
        type: event.type,
        route: event.route,
        timestamp: logEntry.timestamp
      });
    }
  }
}

// Hook para usar no React
export const useSecurityMiddleware = () => {
  const middleware = SecurityMiddleware.getInstance();
  
  return {
    checkRouteAccess: middleware.checkRouteAccess.bind(middleware),
    checkApiAccess: middleware.checkApiAccess.bind(middleware),
    getSecurityHeaders: middleware.getSecurityHeaders.bind(middleware),
    validateSession: middleware.validateSession.bind(middleware),
    logSecurityEvent: middleware.logSecurityEvent.bind(middleware)
  };
};

// Função utilitária para verificar acesso rápido
export const checkQuickAccess = (action: string, isAuthenticated: boolean = false): boolean => {
  return SecurityManager.isActionAllowed(action, isAuthenticated);
};

export default SecurityMiddleware;