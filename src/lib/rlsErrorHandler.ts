/**
 * Utilitário para tratamento de erros RLS 42501
 * Fornece fallbacks seguros quando políticas RLS bloqueiam operações
 */

export interface RLSError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

export interface RLSHandlerResult<T> {
  success: boolean;
  data?: T;
  error?: RLSError;
  fallbackUsed: boolean;
}

/**
 * Verifica se um erro é relacionado a RLS (código 42501)
 */
export function isRLSError(error: any): boolean {
  return error?.code === '42501' || 
         error?.message?.includes('permission denied') ||
         error?.message?.includes('RLS') ||
         error?.message?.includes('row level security');
}

/**
 * Wrapper para operações de banco que podem falhar com RLS 42501
 * Fornece fallbacks seguros e logging adequado
 */
export async function withRLSFallback<T>(
  operation: () => Promise<T>,
  fallback: () => Promise<T> | T,
  operationName: string = 'database operation'
): Promise<RLSHandlerResult<T>> {
  try {
    const data = await operation();
    return {
      success: true,
      data,
      fallbackUsed: false
    };
  } catch (error: any) {
    console.warn(`RLS error in ${operationName}:`, error);
    
    if (isRLSError(error)) {
      try {
        const fallbackData = await fallback();
        console.log(`Using fallback for ${operationName}`);
        return {
          success: true,
          data: fallbackData,
          fallbackUsed: true
        };
      } catch (fallbackError: any) {
        console.error(`Fallback failed for ${operationName}:`, fallbackError);
        return {
          success: false,
          error: {
            code: error.code || '42501',
            message: error.message || 'RLS permission denied',
            details: error.details
          },
          fallbackUsed: true
        };
      }
    }
    
    // Re-throw non-RLS errors
    throw error;
  }
}

/**
 * Fallbacks seguros para operações comuns
 */
export const rlsFallbacks = {
  /**
   * Fallback para busca de perfil de usuário
   */
  getUserProfile: () => ({
    id: 'fallback-profile',
    user_id: 'unknown',
    plan_name: 'start-quantico',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),

  /**
   * Fallback para busca de empresa
   */
  getCompany: () => ({
    id: 'fallback-company',
    user_id: 'unknown',
    company_name: 'Empresa Padrão',
    plan_name: 'start-quantico',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),

  /**
   * Fallback para lista vazia
   */
  getEmptyList: () => [],

  /**
   * Fallback para contagem zero
   */
  getZeroCount: () => ({ count: 0 })
};

/**
 * Middleware para operações de leitura com fallback RLS
 */
export async function safeRead<T>(
  operation: () => Promise<{ data: T; error: any }>,
  fallbackData: T,
  operationName: string = 'read operation'
): Promise<{ data: T; error: any; fallbackUsed?: boolean }> {
  try {
    const result = await operation();
    
    if (result.error && isRLSError(result.error)) {
      console.warn(`RLS error in ${operationName}, using fallback:`, result.error);
      return {
        data: fallbackData,
        error: null,
        fallbackUsed: true
      };
    }
    
    return result;
  } catch (error: any) {
    if (isRLSError(error)) {
      console.warn(`RLS error in ${operationName}, using fallback:`, error);
      return {
        data: fallbackData,
        error: null,
        fallbackUsed: true
      };
    }
    
    // Re-throw non-RLS errors
    throw error;
  }
}

/**
 * Middleware para operações de escrita com fallback RLS
 */
export async function safeWrite<T>(
  operation: () => Promise<{ data: T; error: any }>,
  operationName: string = 'write operation'
): Promise<{ data: T | null; error: any; blocked?: boolean }> {
  try {
    const result = await operation();
    
    if (result.error && isRLSError(result.error)) {
      console.warn(`RLS blocked ${operationName}:`, result.error);
      return {
        data: null,
        error: null, // Não propagar erro RLS como erro crítico
        blocked: true
      };
    }
    
    return result;
  } catch (error: any) {
    if (isRLSError(error)) {
      console.warn(`RLS blocked ${operationName}:`, error);
      return {
        data: null,
        error: null, // Não propagar erro RLS como erro crítico
        blocked: true
      };
    }
    
    // Re-throw non-RLS errors
    throw error;
  }
}

/**
 * Log estruturado para erros RLS
 */
export function logRLSError(error: any, context: string): void {
  if (isRLSError(error)) {
    console.group(`🔒 RLS Error in ${context}`);
    console.warn('Error Code:', error.code);
    console.warn('Message:', error.message);
    if (error.details) console.warn('Details:', error.details);
    if (error.hint) console.warn('Hint:', error.hint);
    console.groupEnd();
  }
}